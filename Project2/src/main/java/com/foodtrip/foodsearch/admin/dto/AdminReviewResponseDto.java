package com.foodtrip.foodsearch.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AdminReviewResponseDto {

    private final Long reviewId;
    private final Long memberId;
    private final String nickname;
    private final String restaurantId;
    private final String restaurantName;
    private final int rating;
    private final String content;
    private final LocalDateTime createdAt;
    // 관리자가 어떤 태그가 선택됐는지 볼 수 있어야 한다는 요청으로 추가(2026-07-23).
    private final List<String> keywords;

    public AdminReviewResponseDto(Long reviewId, Long memberId, String nickname, String restaurantId,
                                   String restaurantName, int rating, String content, LocalDateTime createdAt,
                                   List<String> keywords) {
        this.reviewId = reviewId;
        this.memberId = memberId;
        this.nickname = nickname;
        this.restaurantId = restaurantId;
        this.restaurantName = restaurantName;
        this.rating = rating;
        this.content = content;
        this.createdAt = createdAt;
        this.keywords = keywords;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getNickname() {
        return nickname;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public List<String> getKeywords() {
        return keywords;
    }
}
