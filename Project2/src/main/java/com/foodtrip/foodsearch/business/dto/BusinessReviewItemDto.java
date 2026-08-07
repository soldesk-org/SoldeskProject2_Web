package com.foodtrip.foodsearch.business.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.foodtrip.foodsearch.review.dto.ReviewKeywordResponseDto;

public class BusinessReviewItemDto {

    private final Long reviewId;
    private final String nickname;
    private final int rating;
    private final String content;
    private final boolean receiptVerified;
    private final LocalDateTime createdAt;
    private final List<ReviewKeywordResponseDto> keywords;

    public BusinessReviewItemDto(Long reviewId, String nickname, int rating, String content,
                                  boolean receiptVerified, LocalDateTime createdAt,
                                  List<ReviewKeywordResponseDto> keywords) {
        this.reviewId = reviewId;
        this.nickname = nickname;
        this.rating = rating;
        this.content = content;
        this.receiptVerified = receiptVerified;
        this.createdAt = createdAt;
        this.keywords = keywords;
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
}
