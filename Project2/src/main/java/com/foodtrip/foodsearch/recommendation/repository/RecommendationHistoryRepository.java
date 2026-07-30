package com.foodtrip.foodsearch.recommendation.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.recommendation.entity.RecommendationHistory;

public interface RecommendationHistoryRepository extends JpaRepository<RecommendationHistory, Long> {

    Optional<RecommendationHistory> findByRecommendationHistoryIdAndMemberId(Long recommendationHistoryId, Long memberId);
}
