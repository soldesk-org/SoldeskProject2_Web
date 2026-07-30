package com.foodtrip.foodsearch.parking.client;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
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

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

// 15(주차장-정보) — 공공데이터포털 "한국교통안전공단_주차정보 제공 API"(서비스 B553881/Parking) 클라이언트.
// 이 API는 위도/경도 반경 검색을 지원하지 않고 페이지 단위로 전체 목록만 주기 때문에(001-02 2-1장), 이
// 클라이언트는 "어느 한 지점 근처를 조회"하는 용도가 아니라 ParkingSyncServiceImpl이 페이지를 순회하며
// 전체(또는 지정한 페이지 범위)를 우리 DB로 끌어오는 배치 동기화 용도로만 쓰인다.
//
// **응답 JSON의 정확한 봉투(envelope) 구조는 실제 서비스키로 아직 라이브 검증하지 못했다**(001-03 참고,
// 이 API는 승인 절차가 필요해 개발 시점엔 미승인 상태였음). data.go.kr의 일반적인 두 가지 형태
// (① 최상위에 items 배열이 바로 있는 flat 구조, ② response.body.items.item 형태로 감싸인 구조) 둘 다
// 시도해보고, 두 형태 모두 아니면 명확한 에러를 던지도록 방어적으로 작성했다 — 실제 응답을 받아본 뒤
// 필요하면 파싱 로직을 조정해야 한다.
@Component
public class ParkingDataClient {

    private static final Logger log = LoggerFactory.getLogger(ParkingDataClient.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final String baseUrl;
    private final String serviceKey;

    public ParkingDataClient(@Value("${parking-data.base-url}") String baseUrl,
                              @Value("${parking-data.service-key:}") String serviceKey) {
        this.baseUrl = baseUrl;
        this.serviceKey = serviceKey;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(serviceKey);
    }

    public record FacilityRecord(String externalId, String name, String address, BigDecimal latitude,
                                  BigDecimal longitude, Integer totalSpaces) {
    }

    public record FeeRecord(String externalId, Integer baseTimeMinutes, Integer baseFee,
                             Integer additionalUnitMinutes, Integer additionalUnitFee, Integer dailyFee,
                             Integer monthlyFee) {
    }

    // PrkSttusInfo(주차장 시설정보) - 이름/주소/좌표/총 구획수.
    public List<FacilityRecord> fetchFacilityPage(int pageNo, int numOfRows) {
        JsonNode items = requestItems("/PrkSttusInfo", pageNo, numOfRows);
        List<FacilityRecord> records = new ArrayList<>();
        for (JsonNode item : items) {
            records.add(new FacilityRecord(
                    textOrNull(item, "prk_center_id"),
                    textOrNull(item, "prk_plce_nm"),
                    textOrNull(item, "prk_plce_adres"),
                    decimalOrNull(item, "prk_plce_entrc_la"),
                    decimalOrNull(item, "prk_plce_entrc_lo"),
                    intOrNull(item, "prk_cmprt_co")));
        }
        return records;
    }

    // PrkOprInfo(주차장 운영정보) - 요금 관련 필드만 사용(요일별 운영시간은 응답 키 이름이 요일마다 겹쳐
    // 나와 있어 이번 버전에서는 파싱하지 않음, 001-02 2-4장 참고). 2026-07-26 실제 서비스키로 처음 라이브
    // 호출해보고서야 알게 된 것 - 요금 필드가 최상위가 아니라 basic_info/fxamt_info 객체 안에 중첩돼
    // 있고, 기본요금 필드명도 처음 추정했던 "parking_chrge_bs_chrg"가 아니라 "parking_chrge_bs_chrge"
    // (e가 붙음)였다. 001-02 문서 작성 시점엔 승인 대기 중이라 실제 응답을 볼 수 없어 추정으로 작성했던
    // 부분(001-03 3장에 기록).
    public List<FeeRecord> fetchOperationPage(int pageNo, int numOfRows) {
        JsonNode items = requestItems("/PrkOprInfo", pageNo, numOfRows);
        List<FeeRecord> records = new ArrayList<>();
        for (JsonNode item : items) {
            JsonNode basicInfo = item.path("basic_info");
            JsonNode fxamtInfo = item.path("fxamt_info");
            records.add(new FeeRecord(
                    textOrNull(item, "prk_center_id"),
                    intOrNull(basicInfo, "parking_chrge_bs_time"),
                    intOrNull(basicInfo, "parking_chrge_bs_chrge"),
                    intOrNull(basicInfo, "parking_chrge_adit_unit_time"),
                    intOrNull(basicInfo, "parking_chrge_adit_unit_chrge"),
                    intOrNull(fxamtInfo, "parking_chrge_one_day_chrge"),
                    intOrNull(fxamtInfo, "parking_chrge_mon_unit_chrge")));
        }
        return records;
    }

    private JsonNode requestItems(String operationPath, int pageNo, int numOfRows) {
        String encodedKey = URLEncoder.encode(serviceKey, StandardCharsets.UTF_8);
        String url = baseUrl + operationPath
                + "?serviceKey=" + encodedKey
                + "&pageNo=" + pageNo
                + "&numOfRows=" + numOfRows
                + "&format=2";
        try {
            // 2026-07-27 — 대규모(수만 페이지) 동기화 중 15초 제한에 실제로 걸려 HttpTimeoutException이
            // 나는 걸 로그로 확인한 뒤 30초로 늘림(공공데이터 서버가 가끔 느리게 응답하는 걸로 보임,
            // ParkingSyncServiceImpl의 페이지 재시도와 함께 적용).
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("주차장 API 비정상 응답 [{} pageNo={}] HTTP {} - body: {}", operationPath, pageNo,
                        response.statusCode(), truncate(response.body()));
                throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
            }
            JsonNode root = objectMapper.readTree(response.body());
            // 오퍼레이션 이름(예: PrkSttusInfo)을 키로 넘겨서 실제 응답 형태를 판별한다(아래 extractItems 참고).
            String operationName = operationPath.startsWith("/") ? operationPath.substring(1) : operationPath;
            return extractItems(root, operationName, response.body());
        } catch (IOException | InterruptedException | JacksonException e) {
            // 2026-07-27 — 예전엔 원인을 그냥 삼키고 뭉뚱그린 메시지만 던졌는데, 대규모(수만 페이지) 동기화
            // 중 한 번 실패했을 때 진짜 원인을 알 수 없어서 로그를 남기도록 고침 - 다음에 또 실패하면 이
            // 로그로 바로 원인 파악 가능.
            log.warn("주차장 API 호출 실패 [{} pageNo={}]: {} - {}", operationPath, pageNo,
                    e.getClass().getSimpleName(), e.getMessage());
            throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
        }
    }

    private String truncate(String body) {
        if (body == null) {
            return null;
        }
        return body.length() > 500 ? body.substring(0, 500) + "..." : body;
    }

    // data.go.kr 응답 형태를 순서대로 시도한다. 2026-07-26 실제 서비스키로 처음 확인한 이 API의 실제 형태는
    // 처음에 문서화해뒀던 두 가지(flat items / response.body.items.item) 어느 쪽도 아니고, **오퍼레이션
    // 이름 자체가 최상위 키**였다(예: {"PrkSttusInfo": [...], "resultCode": "0", ...}) - 세 번째 형태로
    // 추가함(001-03 3장에 기록). 기존 두 형태도 혹시 몰라 계속 시도 순서에 남겨둔다(다른 data.go.kr API를
    // 재사용할 가능성 대비).
    private JsonNode extractItems(JsonNode root, String operationName, String rawBody) {
        if (root.has(operationName) && root.get(operationName).isArray()) {
            return root.get(operationName);
        }
        if (root.has("items") && root.get("items").isArray()) {
            return root.get("items");
        }
        JsonNode nested = root.path("response").path("body").path("items").path("item");
        if (nested.isArray()) {
            return nested;
        }
        if (nested.isObject() && !nested.isMissingNode()) {
            // item이 1건뿐이면 배열이 아니라 객체 하나로 오는 경우가 있어 배열로 감싸준다.
            return objectMapper.createArrayNode().add(nested);
        }
        log.warn("주차장 API 응답 형태를 알 수 없음 [{}] - body: {}", operationName, truncate(rawBody));
        throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return (value == null || value.isNull()) ? null : value.asString();
    }

    // 2026-07-26 실제 응답으로 확인 - 숫자로 보이는 필드(예: prk_cmprt_co, 요금)도 실제로는 JSON 문자열
    // ("71")로 내려온다(format=2가 전부 문자열로 감싸서 주는 듯함). isNumber()로만 판별하면 전부 null이
    // 되던 버그가 있어서, 문자열이어도 숫자로 파싱을 시도하도록 고쳤다(decimalOrNull과 같은 패턴).
    private Integer intOrNull(JsonNode node, String field) {
        String text = textOrNull(node, field);
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(text.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal decimalOrNull(JsonNode node, String field) {
        String text = textOrNull(node, field);
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
