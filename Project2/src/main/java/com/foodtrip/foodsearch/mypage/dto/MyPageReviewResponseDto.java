package com.foodtrip.foodsearch.mypage.dto;

import java.time.LocalDateTime;
import java.util.List;

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
    // 리뷰 태그(2026-07-22 추가).
    private final List<ReviewKeywordResponseDto> keywords;

    public MyPageReviewResponseDto(Long reviewId, String restaurantId, String restaurantName, int rating,
                                    String content, boolean receiptVerified, LocalDateTime createdAt,
                                    List<ReviewKeywordResponseDto> keywords) {
        this.reviewId = reviewId;
        this.restaurantId = restaurantId;
        this.restaurantName = restaurantName;
        this.rating = rating;
        this.content = content;
        this.receiptVerified = receiptVerified;
        this.createdAt = createdAt;
        this.keywords = keywords;
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

    public List<ReviewKeywordResponseDto> getKeywords() {
        return keywords;
    }
}
