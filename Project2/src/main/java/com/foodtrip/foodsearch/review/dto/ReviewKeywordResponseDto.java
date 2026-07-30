package com.foodtrip.foodsearch.review.dto;

public class ReviewKeywordResponseDto {

    private final String keyword;
    private final String sentiment;

    public ReviewKeywordResponseDto(String keyword, String sentiment) {
        this.keyword = keyword;
        this.sentiment = sentiment;
    }

    public String getKeyword() {
        return keyword;
    }

    public String getSentiment() {
        return sentiment;
    }
}
