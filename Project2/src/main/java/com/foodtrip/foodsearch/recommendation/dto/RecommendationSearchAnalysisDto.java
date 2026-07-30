package com.foodtrip.foodsearch.recommendation.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

// AI 추천(팀원이 만든 recommendation_api.py, keyword-extraction) POST /api/recommend 응답의 "analysis" —
// 문장에서 뽑아낸 위치/카테고리/메뉴/분위기 키워드. Python 쪽 필드명(snake_case)을 그대로 매핑한다.
@JsonIgnoreProperties(ignoreUnknown = true)
public record RecommendationSearchAnalysisDto(
        List<String> location,
        List<String> category,
        @JsonProperty("menu_keywords") List<String> menuKeywords,
        @JsonProperty("atmosphere_keywords") List<String> atmosphereKeywords,
        @JsonProperty("purpose_keywords") List<String> purposeKeywords,
        @JsonProperty("price_min") Integer priceMin,
        @JsonProperty("price_max") Integer priceMax,
        @JsonProperty("other_keywords") List<String> otherKeywords,
        @JsonProperty("expanded_keywords") List<String> expandedKeywords,
        @JsonProperty("kakao_queries") List<String> kakaoQueries) {
}
