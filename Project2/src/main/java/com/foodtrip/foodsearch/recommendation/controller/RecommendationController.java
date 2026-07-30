package com.foodtrip.foodsearch.recommendation.controller;

import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.recommendation.dto.NearbyCourseRequestDto;
import com.foodtrip.foodsearch.recommendation.dto.NearbyCourseResponseDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendRequestDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendResponseDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendationFeedbackRequestDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendationFeedbackResponseDto;
import com.foodtrip.foodsearch.recommendation.service.NearbyCourseService;
import com.foodtrip.foodsearch.recommendation.service.RecommendationService;

import jakarta.validation.Valid;

// AI 추천(2026-07-22 추가) — 로그인 불필요(07 검색 API와 같은 톤, 자연어 검색도 결국 "검색"의 일종).
// 18.추천-피드백(2026-07-24 추가) — 로그인한 경우에만 이력이 남고, 그 이력에만 피드백을 남길 수 있다.
// 밥 먹고 산책/카페 후속 추천(2026-07-24 추가) — recommend()와 마찬가지로 로그인 불필요.
@RestController
@RequestMapping("/api/recommendation")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final NearbyCourseService nearbyCourseService;

    public RecommendationController(RecommendationService recommendationService,
                                     NearbyCourseService nearbyCourseService) {
        this.recommendationService = recommendationService;
        this.nearbyCourseService = nearbyCourseService;
    }

    @PostMapping("/query")
    public RecommendResponseDto recommend(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                           @Valid @RequestBody RecommendRequestDto request) {
        return recommendationService.recommend(authorizationHeader, request.getText(), request.getX(), request.getY(),
                request.getRadius(), request.getSize());
    }

    @PatchMapping("/{historyId}/feedback")
    public RecommendationFeedbackResponseDto submitFeedback(@RequestHeader("Authorization") String authorizationHeader,
                                                              @PathVariable Long historyId,
                                                              @Valid @RequestBody RecommendationFeedbackRequestDto request) {
        return recommendationService.submitFeedback(authorizationHeader, historyId, request.getWasHelpful());
    }

    @PostMapping("/nearby-course")
    public NearbyCourseResponseDto nearbyCourse(@Valid @RequestBody NearbyCourseRequestDto request) {
        return nearbyCourseService.suggest(request.getType(), request.getAnchorName(), request.getX(), request.getY());
    }
}
