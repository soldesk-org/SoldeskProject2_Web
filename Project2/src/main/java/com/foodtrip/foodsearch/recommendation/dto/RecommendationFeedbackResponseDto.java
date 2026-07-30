package com.foodtrip.foodsearch.recommendation.dto;

public class RecommendationFeedbackResponseDto {

    private final boolean success;
    private final String message;

    public RecommendationFeedbackResponseDto(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }
}
