package com.foodtrip.foodsearch.restaurant.client;

import java.math.BigDecimal;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

/**
 * 카카오 로컬 API "카테고리로 장소 검색"(https://dapi.kakao.com/v2/local/search/category.json) 연동 —
 * 2026-07-21부로 소상공인 공공데이터(구 SmbizStoreClient, 데이터가 오래되고 업종 분류가 부정확한 문제로
 * 폐기)를 완전히 대체함. 네이버 지역 검색 API와 달리 좌표(x,y) + 반경(radius) 파라미터를 공식적으로
 * 지원해서, "이 지역에서 검색"(지도 뷰포트 기준 조회)을 스크래핑 없이도 구현할 수 있다
 * (001-05.네이버-API-위치기반검색-한계-조사.md 참고). 음식점(FD6)과 카페(CE7) 두 카테고리를 함께 조회한다.
 *
 * 인증키는 카카오 로그인(006)에서 이미 쓰고 있는 REST API 키(oauth.kakao.client-id, Kakao Developers
 * 앱의 "REST API 키")를 그대로 재사용한다 — 카카오는 앱당 REST API 키가 하나뿐이라 로그인/로컬 API가
 * 같은 값을 쓴다. 카카오 개발자 콘솔에서 해당 앱의 "제품 설정 > 카카오맵" 사용 설정이 켜져 있어야 한다.
 *
 * 지도 표시 자체(타일/마커 렌더링)는 그대로 네이버 지도(NCP Maps)를 쓴다 — 이 클라이언트는 음식점/카페
 * 데이터 소스만 교체하는 것이고, 지도 UI는 바뀌지 않는다.
 */
@Component
public class KakaoLocalSearchClient {

    private static final String CATEGORY_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/category.json";
    private static final String KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
    // FD6 = 음식점, CE7 = 카페 카테고리 그룹 코드(카카오 로컬 API 공식 문서 기준) — 둘 다 조회해서 합친다.
    private static final List<String> CATEGORY_GROUP_CODES = List.of("FD6", "CE7");
    private static final int PAGE_SIZE = 15;
    // 카카오 로컬 API는 페이지당 최대 15건, 최대 3페이지(총 45건)까지만 허용한다(공식 문서 기준).
    private static final int MAX_PAGE = 3;
    // 카카오 로컬 API가 허용하는 반경 최대값(미터, 공식 문서 기준).
    private static final int MAX_RADIUS_METERS = 20_000;
    private static final double METERS_PER_LAT_DEGREE = 111_320.0;

    private final RestClient restClient = RestClient.create();
    private final String restApiKey;

    public KakaoLocalSearchClient(@Value("${kakao-local.rest-api-key:${oauth.kakao.client-id:}}") String restApiKey) {
        this.restApiKey = restApiKey;
    }

    // 지도 뷰포트(minX/minY/maxX/maxY, 경도/위도)를 받아 그 중심 좌표 + 반경으로 변환해 검색한다
    // (SmbizStoreClient.searchByBoundingBox()와 같은 시그니처 — 드롭인 대체가 가능하도록). 음식점(FD6)과
    // 카페(CE7) 카테고리를 각각 조회해서 하나로 합친다(2026-07-21, "카페도 나오게 해줘" 요청 반영).
    public List<KakaoLocalSearchItem> searchByBoundingBox(double minX, double minY, double maxX, double maxY) {
        double centerX = (minX + maxX) / 2;
        double centerY = (minY + maxY) / 2;
        int radius = estimateRadiusMeters(minX, minY, maxX, maxY, centerY);

        // id 기준으로 중복 제거(카테고리 그룹이 겹쳐서 같은 장소가 두 번 나올 가능성 방지), 순서는 유지.
        Map<String, KakaoLocalSearchItem> merged = new LinkedHashMap<>();
        for (String categoryGroupCode : CATEGORY_GROUP_CODES) {
            for (int page = 1; page <= MAX_PAGE; page++) {
                KakaoPageResult pageResult = fetchPage(categoryGroupCode, centerX, centerY, radius, page);
                for (KakaoLocalSearchItem item : pageResult.items()) {
                    merged.put(item.id(), item);
                }
                if (pageResult.isEnd()) {
                    break;
                }
            }
        }
        return new ArrayList<>(merged.values());
    }

    // 검색 3차 보강용(2026-07-21, 구 네이버 지역 검색 API 대체) — 우리 DB(상호명/메뉴명 LIKE)에 0건일 때
    // 그 키워드를 카카오 키워드 검색으로 실시간 조회해 upsert한다. category_group_code를 FD6/CE7로
    // 제한해서 음식점/카페가 아닌 결과(예: "김밥천국 미용실"처럼 이름만 겹치는 엉뚱한 업종)를 걸러낸다.
    // 위치 편향 없이 전국 기준 관련도순으로 온다 — bbox를 아는 경우엔 searchByKeywordInBoundingBox()를 쓴다.
    public List<KakaoLocalSearchItem> searchByKeyword(String query) {
        Map<String, KakaoLocalSearchItem> merged = new LinkedHashMap<>();
        for (String categoryGroupCode : CATEGORY_GROUP_CODES) {
            KakaoPageResult pageResult = fetchKeywordPage(categoryGroupCode, query, 1, null, null, null);
            for (KakaoLocalSearchItem item : pageResult.items()) {
                merged.put(item.id(), item);
            }
        }
        return new ArrayList<>(merged.values());
    }

    // 이름 검색(2026-07-21 추가) — "써브웨이"처럼 상호명을 입력하면 지금 보고 있는 지도 범위 안의 매장을
    // 전부 찾아준다. 카카오 키워드 검색은 x/y/radius로 위치 편향(그 근처 결과를 우선 반환)을 지원해서,
    // "설빙" 같은 전국 체인이어도 이 범위 안의 지점을 놓치지 않는다(searchByBoundingBox와 같은 중심/반경
    // 계산 재사용). 최대 3페이지(45건)까지 모아서 반환.
    public List<KakaoLocalSearchItem> searchByKeywordInBoundingBox(String query, double minX, double minY,
                                                                     double maxX, double maxY) {
        double centerX = (minX + maxX) / 2;
        double centerY = (minY + maxY) / 2;
        int radius = estimateRadiusMeters(minX, minY, maxX, maxY, centerY);

        Map<String, KakaoLocalSearchItem> merged = new LinkedHashMap<>();
        for (String categoryGroupCode : CATEGORY_GROUP_CODES) {
            for (int page = 1; page <= MAX_PAGE; page++) {
                KakaoPageResult pageResult = fetchKeywordPage(categoryGroupCode, query, page, centerX, centerY, radius);
                for (KakaoLocalSearchItem item : pageResult.items()) {
                    merged.put(item.id(), item);
                }
                if (pageResult.isEnd()) {
                    break;
                }
            }
        }
        return new ArrayList<>(merged.values());
    }

    // 관리자 API 서버 모니터링(2026-08-06 추가) — "설정값 존재 여부만 확인"이 아니라 실제로 카카오에
    // 연결되는지 확인하고 싶다는 요청으로 추가. 카카오 로컬 API는 요청 1건당 과금/쿼터가 동일하게
    // 소모되므로(size를 줄여도 더 저렴해지지 않음) 가장 작은 결과 하나만 요청하는 키워드 검색을 그대로
    // 재사용한다 — 호출 자체를 아예 안 하면 "설정만 확인"으로 되돌아가므로, 대신 호출 빈도를
    // SystemStatusServiceImpl 쪽에서 캐싱해 과도한 쿼터 소모를 막는다.
    public void ping() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(KEYWORD_SEARCH_URL)
                .queryParam("query", "잇티웨이")
                .queryParam("page", 1)
                .queryParam("size", 1);
        URI uri = builder.encode().build().toUri();
        restClient.get()
                .uri(uri)
                .header("Authorization", "KakaoAK " + restApiKey)
                .retrieve()
                .toBodilessEntity();
    }

    @SuppressWarnings("unchecked")
    private KakaoPageResult fetchKeywordPage(String categoryGroupCode, String query, int page,
                                              Double x, Double y, Integer radius) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(KEYWORD_SEARCH_URL)
                .queryParam("query", query)
                .queryParam("category_group_code", categoryGroupCode)
                .queryParam("page", page)
                .queryParam("size", PAGE_SIZE);
        if (x != null && y != null) {
            builder.queryParam("x", x).queryParam("y", y);
            if (radius != null) {
                builder.queryParam("radius", radius);
            }
        }
        URI uri = builder.encode().build().toUri();

        Map<String, Object> body;
        try {
            body = restClient.get()
                    .uri(uri)
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.KAKAO_LOCAL_SEARCH_FAILED,
                    "카카오 로컬 API 호출에 실패했습니다: " + e.getMessage());
        }
        if (body == null || !(body.get("documents") instanceof List) || !(body.get("meta") instanceof Map)) {
            throw new CustomException(ErrorCode.KAKAO_LOCAL_SEARCH_FAILED, "카카오 로컬 API 응답이 올바르지 않습니다.");
        }

        List<Map<String, Object>> documents = (List<Map<String, Object>>) body.get("documents");
        Map<String, Object> meta = (Map<String, Object>) body.get("meta");
        boolean isEnd = Boolean.TRUE.equals(meta.get("is_end"));

        List<KakaoLocalSearchItem> items = new ArrayList<>();
        for (Map<String, Object> document : documents) {
            KakaoLocalSearchItem item = toSearchItem(document);
            if (item != null && isActualFoodOrCafe(item) && matchesQuery(item, query)) {
                items.add(item);
            }
        }
        return new KakaoPageResult(items, isEnd);
    }

    // 카카오 키워드 검색은 category_group_code로 좁혀도 검색어와 상호명이 거의 무관한 결과를 같이 주는
    // 경우가 있다(2026-07-21 실데이터로 확인 — 예: "은행"으로 검색했는데 "노가리"/"호프" 등 검색어와 이름이
    // 전혀 안 겹치는 음식점들이 섞여 나옴). 그래서 상호명에 검색어가 포함된 경우만 남긴다(정규화 후 부분
    // 문자열 포함 — 이 프로젝트가 계속 써온 이름 매칭 톤과 동일).
    private boolean matchesQuery(KakaoLocalSearchItem item, String query) {
        if (item.placeName() == null || query == null) {
            return false;
        }
        return normalize(item.placeName()).contains(normalize(query));
    }

    private String normalize(String value) {
        return value.replaceAll("\\s", "").toLowerCase();
    }

    @SuppressWarnings("unchecked")
    private KakaoPageResult fetchPage(String categoryGroupCode, double x, double y, int radius, int page) {
        URI uri = UriComponentsBuilder.fromUriString(CATEGORY_SEARCH_URL)
                .queryParam("category_group_code", categoryGroupCode)
                .queryParam("x", x)
                .queryParam("y", y)
                .queryParam("radius", radius)
                .queryParam("page", page)
                .queryParam("size", PAGE_SIZE)
                .encode()
                .build()
                .toUri();

        Map<String, Object> body;
        try {
            body = restClient.get()
                    .uri(uri)
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.KAKAO_LOCAL_SEARCH_FAILED,
                    "카카오 로컬 API 호출에 실패했습니다: " + e.getMessage());
        }
        if (body == null || !(body.get("documents") instanceof List) || !(body.get("meta") instanceof Map)) {
            throw new CustomException(ErrorCode.KAKAO_LOCAL_SEARCH_FAILED, "카카오 로컬 API 응답이 올바르지 않습니다.");
        }

        List<Map<String, Object>> documents = (List<Map<String, Object>>) body.get("documents");
        Map<String, Object> meta = (Map<String, Object>) body.get("meta");
        boolean isEnd = Boolean.TRUE.equals(meta.get("is_end"));

        List<KakaoLocalSearchItem> items = new ArrayList<>();
        for (Map<String, Object> document : documents) {
            KakaoLocalSearchItem item = toSearchItem(document);
            if (item != null && isActualFoodOrCafe(item)) {
                items.add(item);
            }
        }
        return new KakaoPageResult(items, isEnd);
    }

    // CE7(카페) 카테고리 그룹 코드에는 실제 카페(음식점 > 카페 > ...)뿐 아니라 보드게임카페/만화카페/
    // 스터디카페 같은 "가정,생활 > 여가시설 > ..." 업종도 함께 묶여 내려온다(2026-07-21 실데이터로 확인 —
    // 예: "레드버튼 강남논현점 | 가정,생활 > 여가시설 > 보드카페 > 레드버튼"). category_name 최상위가
    // "음식점"으로 시작하는 것만 실제 식음료 업장으로 보고 나머지는 걸러낸다.
    private static final String FOOD_CATEGORY_PREFIX = "음식점";

    private boolean isActualFoodOrCafe(KakaoLocalSearchItem item) {
        return item.categoryName() != null && item.categoryName().startsWith(FOOD_CATEGORY_PREFIX);
    }

    private KakaoLocalSearchItem toSearchItem(Map<String, Object> document) {
        BigDecimal longitude = decimalOf(document.get("x"));
        BigDecimal latitude = decimalOf(document.get("y"));
        String id = stringOf(document.get("id"));
        if (id == null || longitude == null || latitude == null) {
            // 식별자/좌표가 없으면 upsert 매칭 키로 쓸 수 없어 건너뛴다(SmbizStoreClient의 동일 규칙 참고).
            return null;
        }
        return new KakaoLocalSearchItem(id, stringOf(document.get("place_name")), stringOf(document.get("category_name")),
                stringOf(document.get("phone")), stringOf(document.get("address_name")),
                stringOf(document.get("road_address_name")), stringOf(document.get("place_url")), longitude, latitude);
    }

    // 위경도 bbox의 대각선 절반 길이를 미터로 근사 변환 — 위도 1도 ≈ 111.32km, 경도 1도 ≈ 111.32km*cos(위도)
    // (Haversine을 쓸 만큼 정밀할 필요는 없음, 카카오 반경 파라미터는 어차피 원형이라 bbox 근사치면 충분).
    private int estimateRadiusMeters(double minX, double minY, double maxX, double maxY, double centerLat) {
        double metersPerLngDegree = METERS_PER_LAT_DEGREE * Math.cos(Math.toRadians(centerLat));
        double halfWidthMeters = (maxX - minX) / 2 * metersPerLngDegree;
        double halfHeightMeters = (maxY - minY) / 2 * METERS_PER_LAT_DEGREE;
        int radius = (int) Math.round(Math.hypot(halfWidthMeters, halfHeightMeters));
        return Math.min(Math.max(radius, 1), MAX_RADIUS_METERS);
    }

    private String stringOf(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }

    private BigDecimal decimalOf(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private record KakaoPageResult(List<KakaoLocalSearchItem> items, boolean isEnd) {
    }
}
