package com.foodtrip.foodsearch.directions.client;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.directions.dto.DirectionsResponseDto;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

// 16(길찾기) — NCP(네이버클라우드플랫폼) Maps "Direction 5"(자동차 길찾기) 클라이언트. 지도 렌더링에 쓰는
// 공개 ncpKeyId와 달리, 이 API는 서버 전용 인증(X-NCP-APIGW-API-KEY-ID/X-NCP-APIGW-API-KEY 헤더)이 필요해
// 프론트에서 직접 호출할 수 없다 — 그래서 우리 서버가 대신 호출해주는 프록시 역할.
@Component
public class NcpDirectionsClient {

    private static final Logger log = LoggerFactory.getLogger(NcpDirectionsClient.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final String baseUrl;
    private final String clientId;
    private final String clientSecret;

    public NcpDirectionsClient(@Value("${ncp-directions.base-url}") String baseUrl,
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

    public DirectionsResponseDto findRoute(BigDecimal startLat, BigDecimal startLng, BigDecimal goalLat,
                                            BigDecimal goalLng) {
        if (!isConfigured()) {
            throw new CustomException(ErrorCode.DIRECTIONS_SERVICE_UNAVAILABLE);
        }
        String url = baseUrl + "?start=" + startLng + "," + startLat + "&goal=" + goalLng + "," + goalLat;
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("X-NCP-APIGW-API-KEY-ID", clientId)
                    .header("X-NCP-APIGW-API-KEY", clientSecret)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("길찾기 API 비정상 응답 HTTP {} - body: {}", response.statusCode(), truncate(response.body()));
                throw new CustomException(ErrorCode.DIRECTIONS_SERVICE_UNAVAILABLE);
            }
            JsonNode root = objectMapper.readTree(response.body());
            int code = root.path("code").asInt(-1);
            if (code != 0) {
                log.warn("길찾기 API 오류 응답: code={}, message={}", code, root.path("message").asString(""));
                throw new CustomException(ErrorCode.DIRECTIONS_SERVICE_UNAVAILABLE);
            }
            JsonNode option = root.path("route").path("traoptimal").get(0);
            if (option == null) {
                throw new CustomException(ErrorCode.DIRECTIONS_SERVICE_UNAVAILABLE);
            }
            JsonNode summary = option.path("summary");
            List<double[]> path = new ArrayList<>();
            for (JsonNode point : option.path("path")) {
                path.add(new double[] { point.get(0).asDouble(), point.get(1).asDouble() });
            }
            return new DirectionsResponseDto(
                    summary.path("distance").asInt(0),
                    summary.path("duration").asLong(0),
                    summary.path("tollFare").asInt(0),
                    summary.path("taxiFare").asInt(0),
                    summary.path("fuelPrice").asInt(0),
                    path);
        } catch (IOException | InterruptedException | JacksonException e) {
            log.warn("길찾기 API 호출 실패: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            throw new CustomException(ErrorCode.DIRECTIONS_SERVICE_UNAVAILABLE);
        }
    }

    private String truncate(String body) {
        if (body == null) {
            return null;
        }
        return body.length() > 500 ? body.substring(0, 500) + "..." : body;
    }
}
