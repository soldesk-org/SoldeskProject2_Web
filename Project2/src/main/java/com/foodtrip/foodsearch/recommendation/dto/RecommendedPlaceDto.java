package com.foodtrip.foodsearch.recommendation.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

// x/y는 카카오 응답 그대로(경도/위도, 문자열) — 지도에 마커 찍을 때 Number로 변환해서 쓰면 된다.
@JsonIgnoreProperties(ignoreUnknown = true)
public record RecommendedPlaceDto(
        @JsonProperty("place_id") String placeId,
        @JsonProperty("place_name") String placeName,
        @JsonProperty("category_name") String categoryName,
        @JsonProperty("category_group_code") String categoryGroupCode,
        @JsonProperty("category_group_name") String categoryGroupName,
        String phone,
        @JsonProperty("address_name") String addressName,
        @JsonProperty("road_address_name") String roadAddressName,
        @JsonProperty("place_url") String placeUrl,
        String x,
        String y,
        String distance,
        @JsonProperty("total_review_count") Integer totalReviewCount,
        @JsonProperty("matched_review_count") Integer matchedReviewCount,
        @JsonProperty("matched_review_ratio") Double matchedReviewRatio,
        @JsonProperty("matched_keywords") List<String> matchedKeywords,
        @JsonProperty("recommendation_type") String recommendationType,
        String reason) {
}
