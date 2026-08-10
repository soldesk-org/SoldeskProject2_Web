package com.foodtrip.foodsearch.business.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.foodtrip.foodsearch.review.dto.ReviewImageResponseDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordResponseDto;

public class BusinessReviewItemDto {

    private final Long reviewId;
    private final String nickname;
    private final int rating;
    private final String content;
    private final boolean receiptVerified;
    private final LocalDateTime createdAt;
    private final List<ReviewKeywordResponseDto> keywords;
    // 2026-08-10 추가 — 고객 리뷰의 첨부 사진(10.리뷰)이 사업자 마이페이지 리뷰 목록에는 안 보이던 걸
    // 발견해 추가. 고객용 ReviewResponseDto.images와 동일한 데이터를 그대로 재사용.
    private final List<ReviewImageResponseDto> images;

    public BusinessReviewItemDto(Long reviewId, String nickname, int rating, String content,
                                  boolean receiptVerified, LocalDateTime createdAt,
                                  List<ReviewKeywordResponseDto> keywords, List<ReviewImageResponseDto> images) {
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
