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
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiResultResponseDto;
import com.foodtrip.foodsearch.foodbti.service.FoodBtiService;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.recommendation.client.RecommendationClient;
import com.foodtrip.foodsearch.restaurant.entity.Favorite;
import com.foodtrip.foodsearch.restaurant.repository.FavoriteRepository;
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
    private final FoodBtiService foodBtiService;
    private final FavoriteRepository favoriteRepository;

    public RecommendationServiceImpl(RecommendationClient recommendationClient,
                                      RecommendationHistoryRepository recommendationHistoryRepository,
                                      JwtProvider jwtProvider,
                                      AccessTokenSessionService accessTokenSessionService,
                                      FoodBtiService foodBtiService,
                                      FavoriteRepository favoriteRepository) {
        this.recommendationClient = recommendationClient;
        this.recommendationHistoryRepository = recommendationHistoryRepository;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
        this.foodBtiService = foodBtiService;
        this.favoriteRepository = favoriteRepository;
    }

    @Override
    @Transactional
    public RecommendResponseDto recommend(String authorizationHeader, String text, Double x, Double y,
                                           Integer radius, Integer size) {
        Long memberId = resolveMemberIdOrNull(authorizationHeader);
        // 2026-08-08 — "내 음식 취향 찾기 반영" 스위치가 로그인 이력 저장에만 쓰이고 실제 추천에는 전혀
        // 반영되지 않고 있던 걸 사용자가 지적해서 추가. 12(음BTI) 결과에서 뽑은 대표 메뉴 몇 개를 사용자
        // 원문 뒤에 자연스러운 문장으로 덧붙여서 Python(recommendation_api.py)의 LLM 분석기에 같이
        // 넘긴다 - 팀원 Python 코드는 건드리지 않고, 입력 텍스트만 보강하는 방식이라 안전하다. 음BTI
        // 결과가 없거나 비로그인이면 원문 그대로 보낸다(조용히 건너뜀, 추천 자체를 막지 않음).
        // 2026-08-10 — 홈 배너("즐겨찾기 이력을 반영해 후보를 추립니다")가 실제로는 반영되지 않고 있던
        // 걸 발견해서 추가. 음BTI 힌트와 같은 방식(원문 텍스트 보강)으로, 최근 즐겨찾기한 가게 이름 몇 개를
        // 자연어 힌트로 덧붙인다.
        String augmentedText = augmentWithFoodBti(authorizationHeader, memberId, text);
        augmentedText = augmentWithFavorites(memberId, augmentedText);
        RecommendResponseDto response = recommendationClient.recommend(augmentedText, x, y, radius, size);

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

    // 로그인 + 음BTI 결과가 있으면 대표 메뉴 상위 3개를 자연어 문장으로 붙인다. 사용자가 이미 명시적으로
    // 원하는 메뉴/카테고리를 말했다면 SYSTEM_PROMPT가 "말하지 않은 정보를 임의로 만들지 않는다"는 원칙과
    // location/menu_keywords는 원문 우선으로 뽑으므로, 이 힌트는 조건이 애매할 때 후보를 좁히는 보조
    // 역할 정도로만 작동한다(강제로 그 메뉴만 나오게 만드는 건 아님).
    private String augmentWithFoodBti(String authorizationHeader, Long memberId, String text) {
        if (memberId == null) {
            return text;
        }
        try {
            FoodBtiResultResponseDto bti = foodBtiService.getMyResult(authorizationHeader);
            List<String> foods = bti.getFood();
            if (foods == null || foods.isEmpty()) {
                return text;
            }
            String preferred = foods.stream().limit(3).collect(Collectors.joining(", "));
            return text + " (평소에 " + preferred + " 같은 메뉴를 좋아해요.)";
        } catch (CustomException e) {
            // 음BTI 결과가 아직 없는 회원(FOOD_BTI_RESULT_NOT_FOUND) — 원문 그대로 진행.
            return text;
        }
    }

    // 최근 즐겨찾기한 가게 이름 상위 3개를 자연어 문장으로 붙인다(2026-08-10 추가) — augmentWithFoodBti와
    // 같은 톤/같은 보조 역할(강제로 그 가게만 나오게 만드는 게 아니라 조건이 애매할 때만 참고).
    // restaurantNameSnapshot만 저장돼 있어 카테고리 정보는 없지만, 가게명 자체도 어느 정도 음식 종류를
    // 암시한다("교촌치킨"처럼)고 판단해 그대로 사용한다.
    private String augmentWithFavorites(Long memberId, String text) {
        if (memberId == null) {
            return text;
        }
        List<Favorite> favorites = favoriteRepository.findByMemberIdOrderByCreatedAtDesc(memberId);
        if (favorites.isEmpty()) {
            return text;
        }
        String preferred = favorites.stream()
                .map(Favorite::getRestaurantNameSnapshot)
                .filter(name -> name != null && !name.isBlank())
                .limit(3)
                .collect(Collectors.joining(", "));
        if (preferred.isBlank()) {
            return text;
        }
        return text + " (평소에 " + preferred + " 같은 곳을 즐겨찾기해뒀어요.)";
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
