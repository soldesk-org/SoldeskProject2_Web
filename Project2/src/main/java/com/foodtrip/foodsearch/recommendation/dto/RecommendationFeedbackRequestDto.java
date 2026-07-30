package com.foodtrip.foodsearch.recommendation.dto;

import jakarta.validation.constraints.NotNull;

public class RecommendationFeedbackRequestDto {

    @NotNull(message = "wasHelpful는 필수입니다.")
    private Boolean wasHelpful;

    protected RecommendationFeedbackRequestDto() {
    }

    public Boolean getWasHelpful() {
        return wasHelpful;
    }
}
