package com.foodtrip.foodsearch.recommendation.service;

import com.foodtrip.foodsearch.recommendation.dto.RecommendResponseDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendationFeedbackResponseDto;

public interface RecommendationService {

    RecommendResponseDto recommend(String authorizationHeader, String text, Double x, Double y,
                                    Integer radius, Integer size);

    RecommendationFeedbackResponseDto submitFeedback(String authorizationHeader, Long historyId, boolean wasHelpful);
}
