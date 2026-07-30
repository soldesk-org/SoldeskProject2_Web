package com.foodtrip.foodsearch.parking.client;

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

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

// 15(주차장-정보) 2차 전환(2026-07-27) — 서울 열린데이터광장 "서울시 주차장 정보"(GetParkInfo) 클라이언트.
// data.go.kr(ParkingDataClient, B553881)과 달리 서울시 한정이지만 전체 규모가 2,189건뿐이라(2026-07-27
// 실측), DB에 미리 동기화해두지 않고 검색할 때마다 전체를 실시간으로 가져와(최대 1000건씩, 3번이면 전체
// 커버) ParkingLotServiceImpl이 그 자리에서 Haversine 거리 계산으로 걸러낸다. 이 API도 위경도를 요청
// 파라미터로 받지 않는다(ADDR 문자열 검색만 가능) — 다만 데이터 규모가 작아 "매번 전체를 가져와서 우리가
// 직접 거리로 거른다"가 실용적으로 가능해진 경우다.
@Component
public class SeoulParkingClient {

    private static final Logger log = LoggerFactory.getLogger(SeoulParkingClient.class);
    // 공식 명세상 한 번에 최대 1000건(ERROR-336). 2026-07-27 실측 기준 전체 2,189건이라 3번이면 충분하지만,
    // 혹시 데이터가 더 늘어나도 대응하도록 list_total_count를 보고 필요한 만큼 반복한다.
    private static final int PAGE_SIZE = 1000;
    private static final int MAX_PAGES_SAFETY_CAP = 20; // 20 * 1000 = 2만 건 — 서울시 데이터가 이보다 커질 리 없어 무한루프 방지용 안전장치

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final String baseUrl;
    private final String serviceKey;

    public SeoulParkingClient(@Value("${seoul-parking-data.base-url}") String baseUrl,
                               @Value("${seoul-parking-data.service-key:}") String serviceKey) {
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

    public record ParkingRecord(String code, String name, String address, BigDecimal latitude, BigDecimal longitude,
                                 Integer totalSpaces, boolean paid, Integer baseFee, Integer baseTimeMinutes,
                                 Integer additionalUnitFee, Integer additionalUnitMinutes) {
    }

    // 전체를 가져온다(최대 1000건씩 페이징) — list_total_count를 응답에서 읽어 필요한 횟수만큼 반복한다.
    public List<ParkingRecord> fetchAll() {
        if (!isConfigured()) {
            throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
        }
        List<ParkingRecord> all = new ArrayList<>();
        int startIndex = 1;
        int totalCount = Integer.MAX_VALUE;
        int pagesFetched = 0;
        while (startIndex <= totalCount && pagesFetched < MAX_PAGES_SAFETY_CAP) {
            int endIndex = startIndex + PAGE_SIZE - 1;
            JsonNode root = request(startIndex, endIndex);
            JsonNode body = root.path("GetParkInfo");
            totalCount = body.path("list_total_count").asInt(totalCount == Integer.MAX_VALUE ? 0 : totalCount);
            JsonNode rows = body.path("row");
            if (rows.isArray()) {
                for (JsonNode row : rows) {
                    ParkingRecord record = toRecord(row);
                    if (record != null) {
                        all.add(record);
                    }
                }
            }
            pagesFetched++;
            startIndex += PAGE_SIZE;
        }
        return all;
    }

    private JsonNode request(int startIndex, int endIndex) {
        String url = baseUrl + "/" + serviceKey + "/json/GetParkInfo/" + startIndex + "/" + endIndex + "/";
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("서울 주차장 API 비정상 응답 [{}~{}] HTTP {}", startIndex, endIndex, response.statusCode());
                throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
            }
            JsonNode root = objectMapper.readTree(response.body());
            String resultCode = root.path("GetParkInfo").path("RESULT").path("CODE").asString("");
            if (!resultCode.isEmpty() && !"INFO-000".equals(resultCode)) {
                log.warn("서울 주차장 API 오류 응답 [{}~{}]: {} - {}", startIndex, endIndex, resultCode,
                        root.path("GetParkInfo").path("RESULT").path("MESSAGE").asString(""));
                throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
            }
            return root;
        } catch (IOException | InterruptedException | JacksonException e) {
            log.warn("서울 주차장 API 호출 실패 [{}~{}]: {} - {}", startIndex, endIndex,
                    e.getClass().getSimpleName(), e.getMessage());
            throw new CustomException(ErrorCode.PARKING_DATA_SERVICE_UNAVAILABLE);
        }
    }

    private ParkingRecord toRecord(JsonNode row) {
        BigDecimal lat = decimalOrNull(row, "LAT");
        BigDecimal lon = decimalOrNull(row, "LOT");
        if (lat == null || lon == null || lat.signum() == 0 || lon.signum() == 0) {
            return null; // 위경도 없는 행은 거리 계산에 못 쓰므로 애초에 제외(2026-07-27 실측 약 1/3이 여기 해당)
        }
        String code = textOrNull(row, "PKLT_CD");
        boolean paid = "Y".equals(textOrNull(row, "CHGD_FREE_SE"));
        return new ParkingRecord(
                code,
                textOrNull(row, "PKLT_NM"),
                textOrNull(row, "ADDR"),
                lat, lon,
                intOrNull(row, "TPKCT"),
                paid,
                intOrNull(row, "PRK_CRG"),
                intOrNull(row, "PRK_HM"),
                intOrNull(row, "ADD_CRG"),
                intOrNull(row, "ADD_UNIT_TM_MNT"));
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asString();
        return (text == null || text.isBlank()) ? null : text;
    }

    // 이 API는 숫자 필드를 JSON 형(0.0 같은 double)으로 내려준다(TYPE=json 실측 확인) — data.go.kr처럼
    // 전부 문자열로 오는 것과 다르다. asInt()로 바로 받되, 혹시 문자열로 오는 경우도 방어적으로 처리한다.
    private Integer intOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.asInt();
        }
        String text = value.asString();
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return (int) Double.parseDouble(text.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal decimalOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.decimalValue();
        }
        String text = value.asString();
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(text.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
