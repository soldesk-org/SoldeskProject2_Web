package com.foodtrip.foodsearch.review.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioResponseDto;
import com.foodtrip.foodsearch.review.service.ReviewKeywordStatsService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/internal/reviews")
public class InternalReviewStatsController {

    private final ReviewKeywordStatsService reviewKeywordStatsService;
    private final String internalToken;

    public InternalReviewStatsController(ReviewKeywordStatsService reviewKeywordStatsService,
                                         @Value("${recommendation.internal-token:}") String internalToken) {
        this.reviewKeywordStatsService = reviewKeywordStatsService;
        this.internalToken = internalToken;
    }

    @PostMapping("/keyword-ratios")
    public ReviewKeywordRatioResponseDto keywordRatios(
            @RequestHeader(value = "X-Internal-Token", required = false) String suppliedToken,
            @Valid @RequestBody ReviewKeywordRatioRequestDto request) {
        verifyInternalToken(suppliedToken);
        return reviewKeywordStatsService.calculateRatios(request);
    }

    // 2026-08-19 수정 — 예전엔 internalToken이 비어있으면(설정 누락) 검사 자체를 건너뛰어 통과시켰다.
    // 이 서버가 아웃바운드로 다른 내부 서버를 호출할 때(BusinessVerificationClient 등)는 "로컬 개발 중
    // 아직 토큰을 안 정했으면 건너뛴다"는 fail-open이 맞지만, 이건 반대로 "남이 우리를 호출하는" 인바운드
    // 게이트라서 fail-open이면 배포 도구가 바뀌면서 이 값이 실수로 빠졌을 때 통계 API가 완전 무인증으로
    // 뚫려버린다(보안 감사로 발견, 2026-08-19). /api/admin/** 같은 인바운드 게이트와 동일하게
    // fail-closed로 바꾼다 — 토큰이 안 정해져 있으면 항상 거부.
    private void verifyInternalToken(String suppliedToken) {
        if (internalToken.isBlank() || suppliedToken == null || !MessageDigest.isEqual(
                internalToken.getBytes(StandardCharsets.UTF_8),
                suppliedToken.getBytes(StandardCharsets.UTF_8))) {
            throw new CustomException(ErrorCode.INTERNAL_API_UNAUTHORIZED);
        }
    }
}
