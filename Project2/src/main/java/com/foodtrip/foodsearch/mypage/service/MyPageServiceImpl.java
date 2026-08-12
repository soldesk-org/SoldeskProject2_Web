package com.foodtrip.foodsearch.mypage.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.mypage.dto.MyPagePlaceResponseDto;
import com.foodtrip.foodsearch.mypage.dto.MyPageReviewResponseDto;
import com.foodtrip.foodsearch.mypage.dto.MyPageSearchHistoryResponseDto;
import com.foodtrip.foodsearch.restaurant.entity.Favorite;
import com.foodtrip.foodsearch.restaurant.entity.SearchHistory;
import com.foodtrip.foodsearch.restaurant.repository.FavoriteRepository;
import com.foodtrip.foodsearch.restaurant.repository.SearchHistoryRepository;
import com.foodtrip.foodsearch.review.dto.ReviewImageResponseDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordResponseDto;
import com.foodtrip.foodsearch.review.entity.Review;
import com.foodtrip.foodsearch.review.entity.ReviewImage;
import com.foodtrip.foodsearch.review.repository.ReviewImageRepository;
import com.foodtrip.foodsearch.review.repository.ReviewRepository;
import com.foodtrip.foodsearch.review.service.ReviewKeywordCatalog;
import com.foodtrip.foodsearch.review.service.ReviewKeywordDao;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 마이페이지(11) — 즐겨찾기/리뷰/방문기록을 읽기 전용으로 모아 보여주는 조회 전용 서비스. 쓰기는 각 도메인
// (즐겨찾기: restaurant/FavoriteService, 리뷰: review/ReviewService)이 그대로 담당하고, 이 서비스는
// 회원 기준으로 다시 조회만 한다(001-02 3장 패키지 구조 참고).
@Service
public class MyPageServiceImpl implements MyPageService {

    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final ReviewKeywordDao reviewKeywordDao;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;
    private final ReviewImageRepository reviewImageRepository;

    public MyPageServiceImpl(FavoriteRepository favoriteRepository, ReviewRepository reviewRepository,
                              SearchHistoryRepository searchHistoryRepository, ReviewKeywordDao reviewKeywordDao,
                              JwtProvider jwtProvider, AccessTokenSessionService accessTokenSessionService,
                              ReviewImageRepository reviewImageRepository) {
        this.favoriteRepository = favoriteRepository;
        this.reviewRepository = reviewRepository;
        this.searchHistoryRepository = searchHistoryRepository;
        this.reviewKeywordDao = reviewKeywordDao;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
        this.reviewImageRepository = reviewImageRepository;
    }

    @Override
    public List<MyPagePlaceResponseDto> getFavorites(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        return favoriteRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(this::toPlaceDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MyPageReviewResponseDto> getReviews(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        List<Review> reviews = reviewRepository
                .findByMemberIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(memberId, Review.STATUS_NORMAL);
        List<Long> reviewIds = reviews.stream().map(Review::getReviewId).collect(Collectors.toList());
        Map<Long, List<String>> keywordsByReviewId = reviewKeywordDao.findKeywordsByReviewIds(reviewIds);
        Map<Long, List<ReviewImageResponseDto>> imagesByReviewId = reviewImageRepository
                .findByReviewIdInOrderByReviewImageIdAsc(reviewIds).stream()
                .collect(Collectors.groupingBy(ReviewImage::getReviewId,
                        Collectors.mapping(img -> new ReviewImageResponseDto(img.getReviewImageId(), img.getImageUrl()),
                                Collectors.toList())));

        return reviews.stream()
                .map(r -> new MyPageReviewResponseDto(r.getReviewId(), r.getRestaurantId(), r.getRestaurantNameSnapshot(),
                        r.getRating(), r.getContent(), r.isReceiptVerified(), r.getCreatedAt(), r.getUpdatedAt(),
                        toKeywordDtos(keywordsByReviewId.getOrDefault(r.getReviewId(), List.of())),
                        imagesByReviewId.getOrDefault(r.getReviewId(), List.of())))
                .collect(Collectors.toList());
    }

    @Override
    public List<MyPagePlaceResponseDto> getVisits(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        return reviewRepository
                .findByMemberIdAndReceiptVerifiedTrueAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(memberId, Review.STATUS_NORMAL)
                .stream()
                .map(r -> new MyPagePlaceResponseDto(r.getRestaurantId(), r.getRestaurantNameSnapshot(),
                        r.getAddressSnapshot(), r.getRoadAddressSnapshot(), r.getLatitudeSnapshot(),
                        r.getLongitudeSnapshot(), r.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Override
    public List<MyPageSearchHistoryResponseDto> getSearchHistories(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        return searchHistoryRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(h -> new MyPageSearchHistoryResponseDto(h.getSearchHistoryId(), h.getKeyword(), h.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteSearchHistory(Long searchHistoryId, String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        SearchHistory history = searchHistoryRepository.findBySearchHistoryIdAndMemberId(searchHistoryId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.SEARCH_HISTORY_NOT_FOUND));
        searchHistoryRepository.delete(history);
    }

    @Override
    @Transactional
    public void clearSearchHistories(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        searchHistoryRepository.deleteByMemberId(memberId);
    }

    private List<ReviewKeywordResponseDto> toKeywordDtos(List<String> keywords) {
        return keywords.stream()
                .map(k -> new ReviewKeywordResponseDto(k, ReviewKeywordCatalog.sentimentOf(k)))
                .collect(Collectors.toList());
    }

    private MyPagePlaceResponseDto toPlaceDto(Favorite favorite) {
        return new MyPagePlaceResponseDto(favorite.getRestaurantId(), favorite.getRestaurantNameSnapshot(),
                favorite.getAddressSnapshot(), favorite.getRoadAddressSnapshot(), favorite.getLatitudeSnapshot(),
                favorite.getLongitudeSnapshot(), favorite.getCreatedAt());
    }

    // 07/08/10/즐겨찾기 기능의 resolveMemberId()와 동일한 로직 — 패키지가 달라 그대로 복제(이 프로젝트가
    // 계속 써온 패턴).
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
