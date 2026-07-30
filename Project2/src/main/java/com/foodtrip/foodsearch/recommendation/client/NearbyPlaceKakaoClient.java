package com.foodtrip.foodsearch.recommendation.client;

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
import com.foodtrip.foodsearch.recommendation.dto.NearbyPlaceCandidate;

// 19(오픈채팅) 이후 신규 - "밥 먹고 산책/카페 어때요" 후속 추천(001-01 참고)에서 방금 추천된 음식점 주변의
// 카페/공원을 찾을 때 쓴다. 07의 KakaoLocalSearchClient(FD6/CE7만 다루고 "음식점"으로 시작하는 카테고리만
// 남기는 필터가 있음)를 그대로 재사용하지 않고 이 기능 전용으로 분리했다 — 공원은 카카오 로컬 API에
// 공식 category_group_code가 없어(음식점/카페와 달리) 순수 키워드 검색을 써야 하고, 결과에 거리
// (distance, sort=distance일 때만 내려옴)도 같이 필요해서 기존 클라이언트의 리턴 타입과 안 맞는다
// (001-02 2장 참고).
@Component
public class NearbyPlaceKakaoClient {

    private static final String KEYWORD_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
    private static final int PAGE_SIZE = 15;

    private final RestClient restClient = RestClient.create();
    private final String restApiKey;

    public NearbyPlaceKakaoClient(@Value("${kakao-local.rest-api-key:${oauth.kakao.client-id:}}") String restApiKey) {
        this.restApiKey = restApiKey;
    }

    // 카페 - CE7 카테고리 그룹으로 좁혀서 검색(07과 동일 코드 체계), 거리순 정렬.
    public List<NearbyPlaceCandidate> searchCafesNearby(double x, double y, int radiusMeters, int size) {
        return search("카페", "CE7", x, y, radiusMeters, size);
    }

    // 공원 - 카카오 로컬 API에 "공원" 전용 category_group_code가 없어(공식 문서에 음식점/카페/관광명소 등만
    // 있고 공원은 없음), category_group_code 없이 순수 키워드("공원")로 검색한다. 카테고리 제한이 없는 만큼
    // 결과에 무관한 장소가 섞일 수 있어, category_name 또는 place_name에 "공원"이 실제로 들어간 것만 남긴다
    // - 다만 "역삼문화공원 제2호공영주차장"처럼 공원 이름을 딴 주차장이 실측으로 섞여 나오는 걸 확인해서
    // (2026-07-25), category_name에 "주차장"이 포함된 건 공원이 아니라 별도로 제외한다.
    public List<NearbyPlaceCandidate> searchParksNearby(double x, double y, int radiusMeters, int size) {
        // 필터링으로 걸러지는 결과가 있을 수 있어(주차장, 공원 이름을 딴 카페 지점 등), size보다 넉넉하게
        // (최대 45건, 카카오 3페이지 한도) 미리 가져온 뒤 필터링하고 나서 size만큼 자른다.
        return search("공원", null, x, y, radiusMeters, PAGE_SIZE * 3).stream()
                .filter(p -> !containsText(p.categoryName(), "주차장"))
                // "메가MGC커피 역삼문화공원점"처럼 상호명/카테고리에 공원 이름이 들어간 음식점/카페가 실측으로
                // 섞여 나오는 걸 확인해서(2026-07-25), category_name 최상위가 "음식점"인 것도 제외한다.
                .filter(p -> !isFoodOrCafeCategory(p.categoryName()))
                .filter(p -> containsText(p.categoryName(), "공원") || containsText(p.placeName(), "공원"))
                .limit(size)
                .toList();
    }

    private boolean isFoodOrCafeCategory(String categoryName) {
        return categoryName != null && categoryName.startsWith("음식점");
    }

    private boolean containsText(String text, String needle) {
        return text != null && text.contains(needle);
    }

    @SuppressWarnings("unchecked")
    private List<NearbyPlaceCandidate> search(String query, String categoryGroupCode, double x, double y,
                                               int radiusMeters, int size) {
        Map<String, NearbyPlaceCandidate> merged = new LinkedHashMap<>();
        for (int page = 1; page <= 3 && merged.size() < size; page++) {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(KEYWORD_SEARCH_URL)
                    .queryParam("query", query)
                    .queryParam("x", x)
                    .queryParam("y", y)
                    .queryParam("radius", Math.min(radiusMeters, 20_000))
                    .queryParam("sort", "distance")
                    .queryParam("page", page)
                    .queryParam("size", PAGE_SIZE);
            if (categoryGroupCode != null) {
                builder.queryParam("category_group_code", categoryGroupCode);
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
            for (Map<String, Object> document : documents) {
                NearbyPlaceCandidate item = toCandidate(document);
                if (item != null) {
                    merged.putIfAbsent(item.placeId(), item);
                }
            }
            if (Boolean.TRUE.equals(meta.get("is_end"))) {
                break;
            }
        }
        return new ArrayList<>(merged.values()).stream().limit(size).toList();
    }

    private NearbyPlaceCandidate toCandidate(Map<String, Object> document) {
        String id = stringOf(document.get("id"));
        String x = stringOf(document.get("x"));
        String y = stringOf(document.get("y"));
        if (id == null || x == null || y == null) {
            return null;
        }
        Integer distance = null;
        String distanceRaw = stringOf(document.get("distance"));
        if (distanceRaw != null) {
            try {
                distance = Integer.parseInt(distanceRaw);
            } catch (NumberFormatException ignored) {
                // distance가 안 오는 경우(정렬 기준이 accuracy일 때 등)는 null로 둔다.
            }
        }
        return new NearbyPlaceCandidate(id, stringOf(document.get("place_name")), stringOf(document.get("category_name")),
                stringOf(document.get("address_name")), stringOf(document.get("road_address_name")),
                stringOf(document.get("place_url")), x, y, distance);
    }

    private String stringOf(Object value) {
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        return s.isEmpty() ? null : s;
    }
}
