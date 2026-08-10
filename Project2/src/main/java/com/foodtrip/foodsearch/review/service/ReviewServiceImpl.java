package com.foodtrip.foodsearch.review.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.common.storage.ReviewImageStorageService;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.receipt.entity.Receipt;
import com.foodtrip.foodsearch.receipt.repository.ReceiptRepository;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;
import com.foodtrip.foodsearch.reviewfilter.client.ReviewFilterClient;
import com.foodtrip.foodsearch.review.dto.CreateReviewRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewImageResponseDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordResponseDto;
import com.foodtrip.foodsearch.review.dto.ReviewResponseDto;
import com.foodtrip.foodsearch.review.dto.UpdateReviewRequestDto;
import com.foodtrip.foodsearch.review.entity.Review;
import com.foodtrip.foodsearch.review.entity.ReviewImage;
import com.foodtrip.foodsearch.review.repository.ReviewImageRepository;
import com.foodtrip.foodsearch.review.repository.ReviewRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 정식 "3. 사용자 기능(리뷰 작성·수정·삭제)"이 나오기 전, 지도 테스트 페이지에서 리뷰 등록/조회를 바로
// 확인할 수 있도록 최소 기능만 구현(2026-07-21) — 이후 수정/삭제(2026-07-22), 태그(2026-07-22)가 추가되어
// 정식 CRUD를 갖춤.
@Service
public class ReviewServiceImpl implements ReviewService {

    // 리뷰 사진 첨부 개수 제한(2026-08-10 추가) — "최대 1~3장" 요청 반영.
    private static final int REVIEW_IMAGE_LIMIT = 3;

    private final ReviewRepository reviewRepository;
    private final RestaurantRepository restaurantRepository;
    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;
    private final ReviewKeywordDao reviewKeywordDao;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;
    private final ReviewFilterClient reviewFilterClient;
    private final ReviewImageRepository reviewImageRepository;
    private final ReviewImageStorageService reviewImageStorageService;

    public ReviewServiceImpl(ReviewRepository reviewRepository,
                              RestaurantRepository restaurantRepository,
                              ReceiptRepository receiptRepository,
                              MemberRepository memberRepository,
                              ReviewKeywordDao reviewKeywordDao,
                              JwtProvider jwtProvider,
                              AccessTokenSessionService accessTokenSessionService,
                              ReviewFilterClient reviewFilterClient,
                              ReviewImageRepository reviewImageRepository,
                              ReviewImageStorageService reviewImageStorageService) {
        this.reviewRepository = reviewRepository;
        this.restaurantRepository = restaurantRepository;
        this.receiptRepository = receiptRepository;
        this.memberRepository = memberRepository;
        this.reviewKeywordDao = reviewKeywordDao;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
        this.reviewFilterClient = reviewFilterClient;
        this.reviewImageRepository = reviewImageRepository;
        this.reviewImageStorageService = reviewImageStorageService;
    }

    // 리뷰 욕설/비속어 필터(17.리뷰-필터링, 2026-07-24 추가) - 태그(keywords)는 고정 목록이라 검사 대상이
    // 아니고, 자유 텍스트인 content만 검사한다. 빈 내용이면 필터 서버를 호출할 필요도 없다.
    private void validateNoProfanity(String content) {
        if (content == null || content.isBlank()) {
            return;
        }
        if (reviewFilterClient.containsProfanity(content)) {
            throw new CustomException(ErrorCode.REVIEW_CONTENT_PROFANITY);
        }
    }

    @Override
    @Transactional
    public ReviewResponseDto create(String authorizationHeader, CreateReviewRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        List<String> keywords = validateKeywords(request.getKeywords());
        if (keywords.isEmpty() && (request.getContent() == null || request.getContent().isBlank())) {
            throw new CustomException(ErrorCode.REVIEW_CONTENT_REQUIRED);
        }
        validateNoProfanity(request.getContent());

        // 2026-07-21: 음식점 데이터를 더 이상 미리 저장해두지 않으므로(카카오 운영정책, 001-05 참고),
        // 이 restaurantId(카카오 place id)로 리뷰를 처음 남기는 경우 부가정보 행을 이 시점에 만든다.
        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(request.getRestaurantId())
                .orElseGet(() -> restaurantRepository.save(Restaurant.createExtras(request.getRestaurantId())));

        // 영수증 인증 필수(2026-07-23 정책 변경) — 애초엔 receiptId가 선택이었으나, "영수증 리뷰로만
        // 등록 가능하게, 일반 리뷰 안 됨"이라는 요청으로 필수로 바뀌었다. 본인이 올린, 이 음식점으로
        // 방문 인증까지 성공한 영수증이어야만 등록 가능(08(영수증OCR) 001-02 5장의 verified 판정 결과를
        // 그대로 신뢰) — 조건이 안 맞으면 미인증 리뷰로 조용히 등록하는 대신 명확히 막는다.
        if (request.getReceiptId() == null) {
            throw new CustomException(ErrorCode.REVIEW_RECEIPT_REQUIRED);
        }
        // 2026-08-10 보안 수정 — 소유자/음식점 일치만 확인하고 정작 OCR 매장명 일치 판정(Receipt.verified)은
        // 한 번도 읽지 않고 있었다. 그래서 다른 가게 영수증이나 OCR이 매칭에 실패한 영수증도 소유자만
        // 맞으면 그대로 "영수증 인증 리뷰"로 등록됐다 — 위 주석의 원래 의도(verified 판정을 신뢰)대로
        // 실제로 그 값을 확인하도록 고친다.
        Receipt receipt = receiptRepository.findByReceiptIdAndDeletedAtIsNull(request.getReceiptId()).orElse(null);
        boolean receiptVerified = receipt != null
                && receipt.getMemberId().equals(memberId)
                && request.getRestaurantId().equals(receipt.getRestaurantId())
                && receipt.isVerified();
        if (!receiptVerified) {
            throw new CustomException(ErrorCode.REVIEW_RECEIPT_NOT_VERIFIED);
        }

        Review review = reviewRepository.save(Review.create(memberId, request.getRestaurantId(), request.getReceiptId(),
                request.getRating(), request.getContent(), null, receiptVerified, request.getRestaurantName(),
                request.getAddress(), request.getRoadAddress(), request.getLatitude(), request.getLongitude()));

        reviewKeywordDao.insertAll(review.getReviewId(), keywords);
        refreshRatingCache(restaurant);

        Member member = memberRepository.findById(memberId).orElse(null);
        return new ReviewResponseDto(review.getReviewId(), member != null ? member.getNickname() : null,
                member != null ? member.getProfileImageUrl() : null,
                review.getRating(), review.getContent(), review.isReceiptVerified(), review.getCreatedAt(),
                toKeywordDtos(keywords), List.of());
    }

    @Override
    public List<ReviewResponseDto> listByRestaurant(String restaurantId) {
        List<Review> reviews = reviewRepository
                .findByRestaurantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(restaurantId, Review.STATUS_NORMAL);
        if (reviews.isEmpty()) {
            return List.of();
        }

        List<Long> memberIds = reviews.stream().map(Review::getMemberId).distinct().collect(Collectors.toList());
        Map<Long, String> nicknameByMemberId = new HashMap<>();
        Map<Long, String> profileImageByMemberId = new HashMap<>();
        for (Member member : memberRepository.findAllById(memberIds)) {
            nicknameByMemberId.put(member.getMemberId(), member.getNickname());
            profileImageByMemberId.put(member.getMemberId(), member.getProfileImageUrl());
        }

        List<Long> reviewIds = reviews.stream().map(Review::getReviewId).collect(Collectors.toList());
        Map<Long, List<String>> keywordsByReviewId = reviewKeywordDao.findKeywordsByReviewIds(reviewIds);
        Map<Long, List<ReviewImageResponseDto>> imagesByReviewId = reviewImageRepository
                .findByReviewIdInOrderByReviewImageIdAsc(reviewIds).stream()
                .collect(Collectors.groupingBy(ReviewImage::getReviewId,
                        Collectors.mapping(this::toImageDto, Collectors.toList())));

        return reviews.stream()
                .map(r -> new ReviewResponseDto(r.getReviewId(), nicknameByMemberId.get(r.getMemberId()),
                        profileImageByMemberId.get(r.getMemberId()),
                        r.getRating(), r.getContent(), r.isReceiptVerified(), r.getCreatedAt(),
                        toKeywordDtos(keywordsByReviewId.getOrDefault(r.getReviewId(), List.of())),
                        imagesByReviewId.getOrDefault(r.getReviewId(), List.of())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReviewResponseDto update(Long reviewId, String authorizationHeader, UpdateReviewRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        List<String> keywords = validateKeywords(request.getKeywords());
        if (keywords.isEmpty() && (request.getContent() == null || request.getContent().isBlank())) {
            throw new CustomException(ErrorCode.REVIEW_CONTENT_REQUIRED);
        }
        validateNoProfanity(request.getContent());

        Review review = reviewRepository.findByReviewIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        if (!review.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.REVIEW_ACCESS_DENIED);
        }
        review.update(request.getRating(), request.getContent());

        reviewKeywordDao.deleteByReviewId(reviewId);
        reviewKeywordDao.insertAll(reviewId, keywords);

        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(review.getRestaurantId())
                .orElse(null);
        if (restaurant != null) {
            refreshRatingCache(restaurant);
        }

        Member member = memberRepository.findById(memberId).orElse(null);
        return new ReviewResponseDto(review.getReviewId(), member != null ? member.getNickname() : null,
                member != null ? member.getProfileImageUrl() : null,
                review.getRating(), review.getContent(), review.isReceiptVerified(), review.getCreatedAt(),
                toKeywordDtos(keywords), toImageDtos(reviewId));
    }

    @Override
    @Transactional
    public void delete(Long reviewId, String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        Review review = reviewRepository.findByReviewIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        if (!review.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.REVIEW_ACCESS_DENIED);
        }
        review.delete();
        reviewKeywordDao.deleteByReviewId(reviewId);
        for (ReviewImage image : reviewImageRepository.findByReviewIdOrderByReviewImageIdAsc(reviewId)) {
            reviewImageStorageService.delete(image.getImageUrl());
        }
        reviewImageRepository.deleteByReviewId(reviewId);

        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(review.getRestaurantId())
                .orElse(null);
        if (restaurant != null) {
            refreshRatingCache(restaurant);
        }
    }

    @Override
    @Transactional
    public List<ReviewImageResponseDto> addImages(Long reviewId, String authorizationHeader, List<MultipartFile> images) {
        Long memberId = resolveMemberId(authorizationHeader);
        Review review = reviewRepository.findByReviewIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        if (!review.getMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.REVIEW_ACCESS_DENIED);
        }
        long existingCount = reviewImageRepository.countByReviewId(reviewId);
        List<MultipartFile> files = images == null ? List.of() : images;
        if (existingCount + files.size() > REVIEW_IMAGE_LIMIT) {
            throw new CustomException(ErrorCode.REVIEW_IMAGE_LIMIT_EXCEEDED);
        }
        for (MultipartFile file : files) {
            String url = reviewImageStorageService.store(file);
            reviewImageRepository.save(ReviewImage.create(reviewId, url));
        }
        return toImageDtos(reviewId);
    }

    private ReviewImageResponseDto toImageDto(ReviewImage image) {
        return new ReviewImageResponseDto(image.getReviewImageId(), image.getImageUrl());
    }

    private List<ReviewImageResponseDto> toImageDtos(Long reviewId) {
        return reviewImageRepository.findByReviewIdOrderByReviewImageIdAsc(reviewId).stream()
                .map(this::toImageDto)
                .collect(Collectors.toList());
    }

    // 목록에 없는 값이 하나라도 있으면 전체를 거부한다(일부만 몰래 버리는 것보다 명확한 에러가 낫다는 판단).
    private List<String> validateKeywords(List<String> rawKeywords) {
        if (rawKeywords == null) {
            return List.of();
        }
        for (String keyword : rawKeywords) {
            if (!ReviewKeywordCatalog.isValid(keyword)) {
                throw new CustomException(ErrorCode.REVIEW_KEYWORD_NOT_ALLOWED, "허용되지 않은 리뷰 태그입니다: " + keyword);
            }
        }
        return rawKeywords;
    }

    private List<ReviewKeywordResponseDto> toKeywordDtos(List<String> keywords) {
        return keywords.stream()
                .map(k -> new ReviewKeywordResponseDto(k, ReviewKeywordCatalog.sentimentOf(k)))
                .collect(Collectors.toList());
    }

    private void refreshRatingCache(Restaurant restaurant) {
        BigDecimal avg = reviewRepository.findAverageRating(restaurant.getRestaurantId());
        BigDecimal rounded = avg != null ? avg.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        long count = reviewRepository.countByRestaurantIdAndStatusAndDeletedAtIsNull(
                restaurant.getRestaurantId(), Review.STATUS_NORMAL);
        restaurant.updateRatingCache(rounded, (int) count);
    }

    // 07/08 기능의 resolveMemberId()와 동일한 로직 — 패키지가 달라 그대로 복제(이 프로젝트가 계속 써온 패턴).
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
