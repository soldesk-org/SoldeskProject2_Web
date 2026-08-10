package com.foodtrip.foodsearch.business.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.business.dto.BusinessReviewItemDto;
import com.foodtrip.foodsearch.business.dto.BusinessReviewsResponseDto;
import com.foodtrip.foodsearch.business.dto.BusinessShopResponseDto;
import com.foodtrip.foodsearch.business.dto.BusinessStatsResponseDto;
import com.foodtrip.foodsearch.business.dto.ClaimRestaurantRequestDto;
import com.foodtrip.foodsearch.business.dto.ReviewTagCountDto;
import com.foodtrip.foodsearch.business.entity.BusinessProfile;
import com.foodtrip.foodsearch.business.repository.BusinessProfileRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.restaurant.dto.BusinessHourResponseDto;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantBusinessHour;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantManager;
import com.foodtrip.foodsearch.restaurant.repository.FavoriteRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantBusinessHourRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantManagerRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;
import com.foodtrip.foodsearch.restaurant.service.RestaurantClaimService;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordResponseDto;
import com.foodtrip.foodsearch.review.entity.Review;
import com.foodtrip.foodsearch.review.repository.ReviewRepository;
import com.foodtrip.foodsearch.review.service.ReviewKeywordCatalog;
import com.foodtrip.foodsearch.review.service.ReviewKeywordDao;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 사업자 마이페이지 "내 매장 관리"(2026-08-06 추가) — business-mypage.html이 원래 갖고 있던
// "GET /api/business/me/stats" / "리뷰 반응" 명세를 실제로 구현한다. 매장 정보 수정/메뉴/사진 관리는
// 이번 범위 밖(사용자가 리뷰 관련 수치·분석만 실데이터로 요청) — 그 탭들은 여전히 준비 중 상태로 둔다.
@Service
public class BusinessDashboardServiceImpl implements BusinessDashboardService {

    private static final int TAG_LIMIT = 4;

    private final RestaurantManagerRepository restaurantManagerRepository;
    private final RestaurantRepository restaurantRepository;
    private final ReviewRepository reviewRepository;
    private final FavoriteRepository favoriteRepository;
    private final MemberRepository memberRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final RestaurantBusinessHourRepository restaurantBusinessHourRepository;
    private final ReviewKeywordDao reviewKeywordDao;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;
    private final RestaurantClaimService restaurantClaimService;

    public BusinessDashboardServiceImpl(RestaurantManagerRepository restaurantManagerRepository,
                                         RestaurantRepository restaurantRepository,
                                         ReviewRepository reviewRepository,
                                         FavoriteRepository favoriteRepository,
                                         MemberRepository memberRepository,
                                         BusinessProfileRepository businessProfileRepository,
                                         RestaurantBusinessHourRepository restaurantBusinessHourRepository,
                                         ReviewKeywordDao reviewKeywordDao,
                                         JwtProvider jwtProvider,
                                         AccessTokenSessionService accessTokenSessionService,
                                         RestaurantClaimService restaurantClaimService) {
        this.restaurantManagerRepository = restaurantManagerRepository;
        this.restaurantRepository = restaurantRepository;
        this.reviewRepository = reviewRepository;
        this.favoriteRepository = favoriteRepository;
        this.memberRepository = memberRepository;
        this.businessProfileRepository = businessProfileRepository;
        this.restaurantBusinessHourRepository = restaurantBusinessHourRepository;
        this.reviewKeywordDao = reviewKeywordDao;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
        this.restaurantClaimService = restaurantClaimService;
    }

    @Override
    public BusinessShopResponseDto getShop(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        String restaurantId = resolveOwnedRestaurantId(memberId);
        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId).orElse(null);
        BusinessProfile profile = businessProfileRepository.findByMemberId(memberId).orElse(null);
        List<BusinessHourResponseDto> businessHours = restaurantBusinessHourRepository
                .findByRestaurantIdOrderByDayOfWeekAsc(restaurantId).stream()
                .map(h -> new BusinessHourResponseDto(h.getDayOfWeek(), h.getOpenTime(), h.getCloseTime(),
                        Boolean.TRUE.equals(h.getIsClosed())))
                .collect(Collectors.toList());
        List<String> amenities = restaurant != null && restaurant.getAmenities() != null && !restaurant.getAmenities().isBlank()
                ? Arrays.asList(restaurant.getAmenities().split(","))
                : List.of();
        return new BusinessShopResponseDto(restaurantId, restaurant != null ? restaurant.getImageUrl() : null,
                profile != null ? profile.getBusinessName() : null,
                profile != null ? profile.getBusinessAddress() : null,
                profile != null ? profile.getBusinessRegistrationNumber() : null,
                restaurant != null ? restaurant.getPhone() : null,
                businessHours,
                restaurant != null ? restaurant.getDescription() : null,
                amenities,
                restaurant != null ? restaurant.getPriceRange() : null,
                restaurant != null && Restaurant.BUSINESS_STATUS_TEMP_CLOSED.equals(restaurant.getBusinessStatus()));
    }

    @Override
    public BusinessStatsResponseDto getStats(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        String restaurantId = resolveOwnedRestaurantId(memberId);

        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId).orElse(null);
        BigDecimal avgRating = restaurant != null && restaurant.getAvgRating() != null
                ? restaurant.getAvgRating() : BigDecimal.ZERO;
        long totalReviewCount = restaurant != null && restaurant.getReviewCount() != null
                ? restaurant.getReviewCount() : 0;
        long favoriteCount = favoriteRepository.countByRestaurantId(restaurantId);

        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = monthStart.plusMonths(1);
        long visitCertThisMonth = reviewRepository.countByRestaurantIdAndReceiptVerifiedTrueAndStatusAndDeletedAtIsNullAndCreatedAtBetween(
                restaurantId, Review.STATUS_NORMAL, monthStart, monthEnd);

        return new BusinessStatsResponseDto(totalReviewCount, avgRating, favoriteCount, visitCertThisMonth);
    }

    @Override
    public BusinessReviewsResponseDto getReviews(String authorizationHeader, int page, int size) {
        Long memberId = resolveMemberId(authorizationHeader);
        String restaurantId = resolveOwnedRestaurantId(memberId);

        Map<Integer, Long> ratingDistribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            ratingDistribution.put(i, 0L);
        }
        for (Integer rating : reviewRepository.findAllRatingsByRestaurantId(restaurantId)) {
            ratingDistribution.merge(rating, 1L, Long::sum);
        }

        List<Map<String, Object>> keywordCounts = reviewKeywordDao.countKeywordsByRestaurantId(restaurantId);
        List<ReviewTagCountDto> positiveTags = new ArrayList<>();
        List<ReviewTagCountDto> negativeTags = new ArrayList<>();
        long positiveTotal = 0;
        long negativeTotal = 0;
        for (Map<String, Object> row : keywordCounts) {
            String keyword = (String) row.get("keyword");
            String sentiment = (String) row.get("sentiment");
            long count = ((Number) row.get("cnt")).longValue();
            if ("POSITIVE".equals(sentiment)) {
                if (positiveTags.size() < TAG_LIMIT) {
                    positiveTags.add(new ReviewTagCountDto(keyword, count));
                }
                positiveTotal += count;
            } else if ("NEGATIVE".equals(sentiment)) {
                if (negativeTags.size() < TAG_LIMIT) {
                    negativeTags.add(new ReviewTagCountDto(keyword, count));
                }
                negativeTotal += count;
            }
        }
        long tagTotal = positiveTotal + negativeTotal;
        int positiveRatio = tagTotal > 0 ? (int) Math.round(positiveTotal * 100.0 / tagTotal) : 0;
        int negativeRatio = tagTotal > 0 ? 100 - positiveRatio : 0;

        Page<Review> reviewPage = reviewRepository.findByRestaurantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
                restaurantId, Review.STATUS_NORMAL, PageRequest.of(page, size));
        List<Review> reviews = reviewPage.getContent();

        List<Long> memberIds = reviews.stream().map(Review::getMemberId).distinct().collect(Collectors.toList());
        Map<Long, String> nicknameByMemberId = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getNickname));
        List<Long> reviewIds = reviews.stream().map(Review::getReviewId).collect(Collectors.toList());
        Map<Long, List<String>> keywordsByReviewId = reviewKeywordDao.findKeywordsByReviewIds(reviewIds);

        List<BusinessReviewItemDto> items = reviews.stream()
                .map(r -> new BusinessReviewItemDto(r.getReviewId(), nicknameByMemberId.get(r.getMemberId()),
                        r.getRating(), r.getContent(), r.isReceiptVerified(), r.getCreatedAt(),
                        toKeywordDtos(keywordsByReviewId.getOrDefault(r.getReviewId(), List.of()))))
                .collect(Collectors.toList());

        return new BusinessReviewsResponseDto(positiveTags, negativeTags, positiveRatio, negativeRatio,
                ratingDistribution, items, reviewPage.hasNext());
    }

    @Override
    public BusinessShopResponseDto claimRestaurant(String authorizationHeader, ClaimRestaurantRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        BusinessProfile profile = businessProfileRepository.findByMemberId(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.BUSINESS_RESTAURANT_NOT_CLAIMED, "사업자 정보를 찾을 수 없습니다."));

        restaurantClaimService.claimByRestaurantId(memberId, profile.getBusinessProfileId(), profile.getBusinessAddress(),
                profile.getBusinessName(), request.getRestaurantId());

        return getShop(authorizationHeader);
    }

    private List<ReviewKeywordResponseDto> toKeywordDtos(List<String> keywords) {
        return keywords.stream()
                .map(k -> new ReviewKeywordResponseDto(k, ReviewKeywordCatalog.sentimentOf(k)))
                .collect(Collectors.toList());
    }

    // RestaurantOwnerServiceImpl.resolveOwnedRestaurant()과 달리 restaurantId를 모르는 상태(로그인한
    // 사업자 회원 정보만 있음)에서 역으로 찾는다 — 아직 매장이 자동귀속되지 않은 사업자(주소 매칭 실패
    // 등)는 BUSINESS_RESTAURANT_NOT_CLAIMED로 안내한다.
    private String resolveOwnedRestaurantId(Long memberId) {
        return restaurantManagerRepository
                .findFirstByMemberIdAndManagerStatus(memberId, RestaurantManager.STATUS_ACTIVE)
                .map(RestaurantManager::getRestaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.BUSINESS_RESTAURANT_NOT_CLAIMED));
    }

    // 07/08/10/즐겨찾기 기능의 resolveMemberId()와 동일한 로직 — 패키지가 달라 그대로 복제(이 프로젝트가 계속 써온 패턴).
    private Long resolveMemberId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        Claims claims;
        try {
            claims = jwtProvider.parseClaims(accessToken);
        } catch (JwtException e) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        if (!accessTokenSessionService.isActive(claims.getId())) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        return Long.valueOf(claims.getSubject());
    }
}
