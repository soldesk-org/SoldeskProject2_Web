package com.foodtrip.foodsearch.recommendation.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.recommendation.client.RecommendationClient;
import com.foodtrip.foodsearch.recommendation.dto.RecommendResponseDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendationFeedbackResponseDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendationSearchAnalysisDto;
import com.foodtrip.foodsearch.recommendation.entity.RecommendationHistory;
import com.foodtrip.foodsearch.recommendation.repository.RecommendationHistoryRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 18.추천-피드백(2026-07-24 추가) — 기존엔 RecommendationController가 RecommendationClient를 바로
// 호출해서 Python 응답을 그대로 프록시만 했다(이력 저장 없음). 이 서비스가 그 사이에 끼어들어, 로그인한
// 경우에만 recommendation_histories에 이력을 남기고 응답에 historyId를 실어 보낸다 — 07/12와 같은
// "로그인 필수 아님 - resolveMemberIdOrNull 패턴"을 그대로 재사용(비로그인 요청은 원래대로 계속 됨).
@Service
public class RecommendationServiceImpl implements RecommendationService {

    private static final int MAX_KEYWORDS_LENGTH = 500;

    private final RecommendationClient recommendationClient;
    private final RecommendationHistoryRepository recommendationHistoryRepository;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public RecommendationServiceImpl(RecommendationClient recommendationClient,
                                      RecommendationHistoryRepository recommendationHistoryRepository,
                                      JwtProvider jwtProvider,
                                      AccessTokenSessionService accessTokenSessionService) {
        this.recommendationClient = recommendationClient;
        this.recommendationHistoryRepository = recommendationHistoryRepository;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    @Transactional
    public RecommendResponseDto recommend(String authorizationHeader, String text, Double x, Double y,
                                           Integer radius, Integer size) {
        RecommendResponseDto response = recommendationClient.recommend(text, x, y, radius, size);

        Long memberId = resolveMemberIdOrNull(authorizationHeader);
        if (memberId == null) {
            return response; // 비로그인 - 이력 저장 안 함, historyId도 null인 채로 그대로 반환
        }

        RecommendationHistory history = RecommendationHistory.create(
                memberId, text, extractKeywords(response.analysis()),
                y != null ? BigDecimal.valueOf(y) : null,
                x != null ? BigDecimal.valueOf(x) : null,
                response.analysis() != null ? response.analysis().priceMax() : null);
        recommendationHistoryRepository.save(history);

        return new RecommendResponseDto(response.analysis(), response.recommendationRule(), response.dataNotice(),
                response.totalCandidates(), response.recommendations(), history.getRecommendationHistoryId());
    }

    @Override
    @Transactional
    public RecommendationFeedbackResponseDto submitFeedback(String authorizationHeader, Long historyId, boolean wasHelpful) {
        Long memberId = resolveMemberId(authorizationHeader);
        RecommendationHistory history = recommendationHistoryRepository
                .findByRecommendationHistoryIdAndMemberId(historyId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.RECOMMENDATION_HISTORY_NOT_FOUND));
        history.submitFeedback(wasHelpful);
        return new RecommendationFeedbackResponseDto(true, "피드백이 저장되었습니다.");
    }

    // analysis의 여러 키워드 목록을 하나로 합쳐 500자 제한(extracted_keywords 컬럼)에 맞게 자른다.
    private String extractKeywords(RecommendationSearchAnalysisDto analysis) {
        if (analysis == null) {
            return null;
        }
        String joined = Stream.of(analysis.location(), analysis.category(), analysis.menuKeywords(),
                        analysis.atmosphereKeywords(), analysis.purposeKeywords(), analysis.otherKeywords())
                .filter(list -> list != null)
                .flatMap(List::stream)
                .collect(Collectors.joining(", "));
        return joined.length() > MAX_KEYWORDS_LENGTH ? joined.substring(0, MAX_KEYWORDS_LENGTH) : joined;
    }

    // 07/08/12와 동일한 resolveMemberId()/resolveMemberIdOrNull() 복제 패턴(패키지가 달라 공유하지 않음,
    // CLAUDE.md 2장 참고).
    private Long resolveMemberId(String authorizationHeader) {
        Long memberId = resolveMemberIdOrNull(authorizationHeader);
        if (memberId == null) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        return memberId;
    }

    private Long resolveMemberIdOrNull(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        try {
            Claims claims = jwtProvider.parseClaims(accessToken);
            if (!accessTokenSessionService.isActive(claims.getId())) {
                return null;
            }
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
