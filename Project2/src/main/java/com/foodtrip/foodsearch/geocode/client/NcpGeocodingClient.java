package com.foodtrip.foodsearch.geocode.client;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.geocode.dto.GeocodeResponseDto;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

// 사업자 회원가입 STEP2 주소 검색(2026-08-04 신규) — NCP(네이버클라우드플랫폼) Maps "Geocoding" 서브 API로
// 도로명주소 문자열을 좌표(위도/경도)로 변환한다. 16(길찾기)의 NcpDirectionsClient와 같은 NCP Maps
// Client ID/Secret(ncp-directions.client-id/secret, 서버 전용 인증 헤더)을 그대로 재사용한다 — 같은 NCP
// 콘솔 "Application"에 묶인 같은 상품군의 다른 서브 API이기 때문.
@Component
public class NcpGeocodingClient {

    private static final Logger log = LoggerFactory.getLogger(NcpGeocodingClient.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final String baseUrl;
    private final String clientId;
    private final String clientSecret;

    public NcpGeocodingClient(@Value("${ncp-geocoding.base-url}") String baseUrl,
                               @Value("${ncp-directions.client-id:}") String clientId,
                               @Value("${ncp-directions.client-secret:}") String clientSecret) {
        this.baseUrl = baseUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(clientId) && StringUtils.hasText(clientSecret);
    }

    public GeocodeResponseDto geocode(String query) {
        if (!isConfigured()) {
            throw new CustomException(ErrorCode.GEOCODE_SERVICE_UNAVAILABLE);
        }
        String url = baseUrl + "?query=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("x-ncp-apigw-api-key-id", clientId)
                    .header("x-ncp-apigw-api-key", clientSecret)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Geocoding API 비정상 응답 HTTP {} - body: {}", response.statusCode(), truncate(response.body()));
                throw new CustomException(ErrorCode.GEOCODE_SERVICE_UNAVAILABLE);
            }
            JsonNode root = objectMapper.readTree(response.body());
            if (!"OK".equals(root.path("status").asString(""))) {
                log.warn("Geocoding API 오류 응답: {}", truncate(response.body()));
                throw new CustomException(ErrorCode.GEOCODE_SERVICE_UNAVAILABLE);
            }
            JsonNode first = root.path("addresses").get(0);
            if (first == null) {
                throw new CustomException(ErrorCode.GEOCODE_NOT_FOUND);
            }
            BigDecimal lng = new BigDecimal(first.path("x").asString());
            BigDecimal lat = new BigDecimal(first.path("y").asString());
            String roadAddress = first.path("roadAddress").asString("");
            return new GeocodeResponseDto(lat, lng, roadAddress);
        } catch (IOException | InterruptedException | JacksonException | NumberFormatException e) {
            log.warn("Geocoding API 호출 실패: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            throw new CustomException(ErrorCode.GEOCODE_SERVICE_UNAVAILABLE);
        }
    }

    private String truncate(String body) {
        if (body == null) {
            return null;
        }
        return body.length() > 500 ? body.substring(0, 500) + "..." : body;
    }
}
