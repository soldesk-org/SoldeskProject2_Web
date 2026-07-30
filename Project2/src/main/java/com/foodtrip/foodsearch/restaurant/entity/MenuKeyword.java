package com.foodtrip.foodsearch.restaurant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// 팀이 전달한 키워드 마스터(web_menu_keyword_db.xlsx, menu_keyword 시트, 2026-07-21 도입)를 그대로 옮긴
// 테이블 — 음식점 이름/메뉴명에 이 키워드가 있으면 그 카테고리로 자동 분류한다(RestaurantCategoryMatchingService
// 참고). category_code가 없는 행(예: "어르신이 먹기 좋은" 같은 교차-카테고리 특성 키워드)은 이번 분류 로직
// 에서는 쓰지 않고 그대로 저장만 해둔다(추후 검색 가중치 기능 등에 재사용할 수 있어서 폐기하지 않음).
@Entity
@Table(name = "menu_keywords")
public class MenuKeyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "keyword_id")
    private Long keywordId;

    @Column(name = "category_code", length = 30)
    private String categoryCode;

    @Column(name = "keyword_group_code", nullable = false, length = 50)
    private String keywordGroupCode;

    @Column(name = "keyword_group_name_ko", nullable = false, length = 50)
    private String keywordGroupNameKo;

    @Column(name = "keyword_ko", nullable = false, length = 100)
    private String keywordKo;

    @Column(name = "normalized_keyword_ko", nullable = false, length = 100)
    private String normalizedKeywordKo;

    @Column(name = "keyword_type", nullable = false, length = 30)
    private String keywordType;

    @Column(name = "match_scope", nullable = false, length = 40)
    private String matchScope;

    @Column(name = "search_weight", nullable = false)
    private Integer searchWeight;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    protected MenuKeyword() {
    }

    public static MenuKeyword createFromSeed(String categoryCode, String keywordGroupCode, String keywordGroupNameKo,
                                              String keywordKo, String normalizedKeywordKo, String keywordType,
                                              String matchScope, int searchWeight, boolean isActive) {
        MenuKeyword keyword = new MenuKeyword();
        keyword.categoryCode = (categoryCode == null || categoryCode.isBlank()) ? null : categoryCode;
        keyword.keywordGroupCode = keywordGroupCode;
        keyword.keywordGroupNameKo = keywordGroupNameKo;
        keyword.keywordKo = keywordKo;
        keyword.normalizedKeywordKo = normalizedKeywordKo;
        keyword.keywordType = keywordType;
        keyword.matchScope = matchScope;
        keyword.searchWeight = searchWeight;
        keyword.isActive = isActive;
        return keyword;
    }

    public Long getKeywordId() {
        return keywordId;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public String getKeywordKo() {
        return keywordKo;
    }

    public Integer getSearchWeight() {
        return searchWeight;
    }

    public boolean isActive() {
        return isActive;
    }
}
