package com.foodtrip.foodsearch.review.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ReviewKeywordRatioItemDto(
        @JsonProperty("place_id") String placeId,
        @JsonProperty("total_review_count") long totalReviewCount,
        @JsonProperty("matched_review_count") long matchedReviewCount,
        @JsonProperty("matched_review_ratio") double matchedReviewRatio,
        @JsonProperty("matched_keywords") List<String> matchedKeywords) {
}
