package com.foodtrip.foodsearch.restaurant.service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.restaurant.entity.MenuKeyword;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantCategory;
import com.foodtrip.foodsearch.restaurant.repository.MenuKeywordRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantCategoryRepository;

// 음식점 카테고리 자동분류(2026-07-21 전면 개편, 2026-07-21 2차 개편으로 DB 저장 제거). 팀이 전달한 키워드
// 마스터(web_menu_keyword_db.xlsx)를 menu_keywords 테이블로 옮겨두고(RestaurantCategorySeeder), 음식점
// 이름 + 등록된 메뉴명에 그 키워드가 포함되는지로 카테고리를 정한다.
//
// 카카오 로컬 API 운영정책(2026-07-21 확인)상 카카오가 주는 상호명을 DB에 저장할 수 없어, 검색/상세조회
// 때마다 카카오 라이브 응답의 상호명으로 매번 다시 분류한다 — 분류 결과(categoryId)도 DB에 저장하지 않고
// 그때그때 계산해서 응답에만 실어 보낸다(RestaurantServiceImpl 참고).
@Service
public class RestaurantCategoryMatchingService {

    private final MenuKeywordRepository menuKeywordRepository;
    private final RestaurantCategoryRepository restaurantCategoryRepository;

    public RestaurantCategoryMatchingService(MenuKeywordRepository menuKeywordRepository,
                                              RestaurantCategoryRepository restaurantCategoryRepository) {
        this.menuKeywordRepository = menuKeywordRepository;
        this.restaurantCategoryRepository = restaurantCategoryRepository;
    }

    // 검색 결과 목록 하나를 처리하는 동안 매 음식점마다 키워드 970여 건을 다시 조회하지 않도록, 호출 쪽이
    // 요청 시작 시 한 번만 불러서 재사용한다.
    public List<MenuKeyword> loadActiveKeywords() {
        return menuKeywordRepository.findByIsActiveTrueAndCategoryCodeIsNotNull();
    }

    // 음식점 이름 + 메뉴명(있으면)에 마스터 키워드가 포함되는지 검사해서 가장 search_weight가 높은 매칭의
    // 카테고리를 반환한다("음식점 하나당 카테고리 하나" 원칙, 엑셀 README). 일치하는 게 없으면 empty.
    public Optional<RestaurantCategory> classify(String name, List<String> menuNames, List<MenuKeyword> keywords) {
        String nameHaystack = normalize(name);
        List<String> menuHaystacks = menuNames.stream().map(this::normalize).toList();

        Optional<MenuKeyword> best = keywords.stream()
                .filter(kw -> matches(kw, nameHaystack, menuHaystacks))
                .max(Comparator.comparingInt(MenuKeyword::getSearchWeight));

        if (best.isEmpty()) {
            return Optional.empty();
        }
        return restaurantCategoryRepository.findByCategoryCode(best.get().getCategoryCode());
    }

    private boolean matches(MenuKeyword keyword, String nameHaystack, List<String> menuHaystacks) {
        String needle = normalize(keyword.getKeywordKo());
        if (needle.isEmpty()) {
            return false;
        }
        return nameHaystack.contains(needle) || menuHaystacks.stream().anyMatch(m -> m.contains(needle));
    }

    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("\\s", "");
    }

    // 카카오 원본 카테고리(예: "음식점 > 한식 > 육류,고기")로 보조 분류(2026-07-23 추가) — 위 classify()가
    // 상호명/메뉴명에 우리 키워드 마스터가 포함될 때만 분류하다 보니, "땀땀 본점"처럼 상호명에 음식 종류가
    // 안 드러나는 가게는 대부분 분류 실패(empty)로 남는 문제가 있었다("지도 마커 전체 다 섞여도 좋으니
    // 자기들 이미지 쓰게 해줘"라는 요청으로, 커버리지를 높이기 위해 도입). 카카오가 검색 결과마다 이미
    // 내려주는 원본 카테고리 문자열을 2차 신호로 써서, 1차 분류가 실패했을 때만 이걸로 다시 시도한다 —
    // 1차(우리 키워드 마스터)가 항상 우선이라는 원칙은 그대로 유지.
    private static final Map<String, String[]> KAKAO_CATEGORY_FALLBACK = new LinkedHashMap<>();
    static {
        KAKAO_CATEGORY_FALLBACK.put("FAST_FOOD", new String[]{"패스트푸드", "치킨", "피자", "버거", "햄버거"});
        KAKAO_CATEGORY_FALLBACK.put("BUFFET", new String[]{"뷔페"});
        KAKAO_CATEGORY_FALLBACK.put("BAR", new String[]{"술집", "호프", "요리주점", "포차", "와인바", "칵테일바", "이자카야"});
        KAKAO_CATEGORY_FALLBACK.put("CAFE_DESSERT", new String[]{"카페", "디저트", "베이커리", "제과"});
        KAKAO_CATEGORY_FALLBACK.put("SNACK", new String[]{"분식"});
        KAKAO_CATEGORY_FALLBACK.put("KOREAN", new String[]{"한식"});
        KAKAO_CATEGORY_FALLBACK.put("WESTERN", new String[]{"양식", "이탈리안", "스테이크"});
        // "중국요리"/"중국집" 추가(2026-08-08) — AI 추천 공유 링크 실사용 중 카카오 category_name이
        // "중국요리"만 있고 "중식"/"중국음식"은 없는 가게(예: "무궁화반점")가 미분류로 떨어지는 걸 확인.
        KAKAO_CATEGORY_FALLBACK.put("CHINESE", new String[]{"중식", "중국음식", "중국요리", "중국집"});
        KAKAO_CATEGORY_FALLBACK.put("JAPANESE", new String[]{"일식", "일본음식", "돈까스", "스시", "초밥"});
        KAKAO_CATEGORY_FALLBACK.put("ASIAN", new String[]{"아시아", "베트남", "태국", "인도음식", "세계음식"});
    }

    public Optional<RestaurantCategory> classifyByKakaoCategoryName(String kakaoCategoryName) {
        String haystack = normalize(kakaoCategoryName);
        if (haystack.isEmpty()) {
            return Optional.empty();
        }
        for (Map.Entry<String, String[]> entry : KAKAO_CATEGORY_FALLBACK.entrySet()) {
            for (String needle : entry.getValue()) {
                if (haystack.contains(needle)) {
                    return restaurantCategoryRepository.findByCategoryCode(entry.getKey());
                }
            }
        }
        return Optional.empty();
    }
}
