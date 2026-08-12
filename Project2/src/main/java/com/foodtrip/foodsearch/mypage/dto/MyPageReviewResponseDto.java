package com.foodtrip.foodsearch.mypage.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.foodtrip.foodsearch.review.dto.ReviewImageResponseDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordResponseDto;

// 내 리뷰 목록(11-4장) — 07의 리뷰 목록(음식점 기준)과 달리 회원 기준이라 nickname 대신 restaurantName을 담는다.
public class MyPageReviewResponseDto {

    private final Long reviewId;
    private final String restaurantId;
    private final String restaurantName;
    private final int rating;
    private final String content;
    private final boolean receiptVerified;
    private final LocalDateTime createdAt;
    // 2026-08-12 추가 — "수정하면 작성일이 '수정됨'으로 표시됩니다" 안내 문구가 실제로는 아무 데도
    // 반영이 안 되고 있던 걸 발견해서 추가.
    private final LocalDateTime updatedAt;
    // 리뷰 태그(2026-07-22 추가).
    private final List<ReviewKeywordResponseDto> keywords;
    // 2026-08-10 추가 — 리뷰 첨부 사진이 이 "내가 쓴 리뷰" 목록엔 안 보이던 걸 발견해 추가(고객용
    // 음식점 상세/사업자 마이페이지엔 이미 있었는데 여기만 빠져 있었음).
    private final List<ReviewImageResponseDto> images;
    // 2026-08-12 추가 — "가게 보기"가 explore.html의 공유 링크(?shopId=...) 흐름을 타려면 카카오 단건
    // 재조회가 안 되는 구조상 name/address/좌표를 함께 실어보내야 한다(RestaurantServiceImpl.verifySnapshot
    // 참고). reviews 테이블에 이미 있던 스냅샷 컬럼을 그대로 노출.
    private final String address;
    private final String roadAddress;
    private final BigDecimal latitude;
    private final BigDecimal longitude;

    public MyPageReviewResponseDto(Long reviewId, String restaurantId, String restaurantName, int rating,
                                    String content, boolean receiptVerified, LocalDateTime createdAt,
                                    LocalDateTime updatedAt, List<ReviewKeywordResponseDto> keywords,
                                    List<ReviewImageResponseDto> images, String address, String roadAddress,
                                    BigDecimal latitude, BigDecimal longitude) {
        this.reviewId = reviewId;
        this.restaurantId = restaurantId;
        this.restaurantName = restaurantName;
        this.rating = rating;
        this.content = content;
        this.receiptVerified = receiptVerified;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.keywords = keywords;
        this.images = images;
        this.address = address;
        this.roadAddress = roadAddress;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getRestaurantName() {
        return restaurantName;
    }

    public int getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public boolean isReceiptVerified() {
        return receiptVerified;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<ReviewKeywordResponseDto> getKeywords() {
        return keywords;
    }

    public List<ReviewImageResponseDto> getImages() {
        return images;
    }

    public String getAddress() {
        return address;
    }

    public String getRoadAddress() {
        return roadAddress;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }
}
