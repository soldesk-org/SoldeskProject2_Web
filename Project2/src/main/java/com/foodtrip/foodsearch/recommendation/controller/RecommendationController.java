package com.foodtrip.foodsearch.recommendation.controller;

import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.recommendation.client.RecommendationClient;
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
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final NearbyCourseService nearbyCourseService;
    private final RecommendationClient recommendationClient;

    // 2026-08-22 추가 — AI 추천 서버는 팀원 로컬 PC에서 필요할 때만 켜는 서버라 항상 떠있지 않다.
    // 헤더 메뉴가 페이지마다(거의 모든 화면) 이 상태를 확인하므로, 매번 실제로 핑을 보내지 않고
    // 10초 캐시로 재사용한다(admin의 checkWithCache와 같은 취지, 다만 공개 API라 더 단순하게).
    private static final long STATUS_CACHE_MS = 10_000L;
    private final AtomicLong statusCheckedAt = new AtomicLong(0L);
    private final AtomicBoolean statusCached = new AtomicBoolean(false);

    public RecommendationController(RecommendationService recommendationService,
                                     NearbyCourseService nearbyCourseService,
                                     RecommendationClient recommendationClient) {
        this.recommendationService = recommendationService;
        this.nearbyCourseService = nearbyCourseService;
        this.recommendationClient = recommendationClient;
    }

    // 2026-08-22 추가 — "AI 추천" 메뉴/버튼을 서버가 켜져 있을 때만 보이게 하고, 꺼져있는데 URL로 직접
    // 들어오면 "서비스 준비중" 화면을 보여주기 위한 공개 상태 확인 API. 로그인 불필요.
    @GetMapping("/status")
    public Map<String, Object> status() {
        long now = System.currentTimeMillis();
        long lastChecked = statusCheckedAt.get();
        if (now - lastChecked < STATUS_CACHE_MS) {
            return Map.of("up", statusCached.get());
        }
        boolean up = recommendationClient.isUp();
        statusCached.set(up);
        statusCheckedAt.set(now);
        return Map.of("up", up);
    }

    @PostMapping
    public RecommendResponseDto recommend(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                           @Valid @RequestBody RecommendRequestDto request) {
        return recommendationService.recommend(authorizationHeader, request.getText(), request.getX(), request.getY(),
                request.getRadius(), request.getSize());
    }

    @PatchMapping("/{historyId}")
    public RecommendationFeedbackResponseDto submitFeedback(@RequestHeader("Authorization") String authorizationHeader,
                                                              @PathVariable Long historyId,
                                                              @Valid @RequestBody RecommendationFeedbackRequestDto request) {
        return recommendationService.submitFeedback(authorizationHeader, historyId, request.getWasHelpful());
    }

    @PostMapping("/nearby-places")
    public NearbyCourseResponseDto nearbyCourse(@Valid @RequestBody NearbyCourseRequestDto request) {
        return nearbyCourseService.suggest(request.getType(), request.getAnchorName(), request.getX(), request.getY());
    }
}
