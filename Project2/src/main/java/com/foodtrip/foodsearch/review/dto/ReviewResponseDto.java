package com.foodtrip.foodsearch.review.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ReviewResponseDto {

    private final Long reviewId;
    private final String nickname;
    private final int rating;
    private final String content;
    private final boolean receiptVerified;
    private final LocalDateTime createdAt;
    // 리뷰 태그(2026-07-22 추가) — review_keywords 테이블에서 조회한 값.
    private final List<ReviewKeywordResponseDto> keywords;
    // 리뷰 사진(2026-08-10 추가) — 최대 3장, 등록 순서대로.
    private final List<ReviewImageResponseDto> images;

    public ReviewResponseDto(Long reviewId, String nickname, int rating, String content,
                              boolean receiptVerified, LocalDateTime createdAt, List<ReviewKeywordResponseDto> keywords,
                              List<ReviewImageResponseDto> images) {
        this.reviewId = reviewId;
        this.nickname = nickname;
        this.rating = rating;
        this.content = content;
        this.receiptVerified = receiptVerified;
        this.createdAt = createdAt;
        this.keywords = keywords;
        this.images = images;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public String getNickname() {
        return nickname;
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

    public List<ReviewImageResponseDto> getImages() {
        return images;
    }
}
