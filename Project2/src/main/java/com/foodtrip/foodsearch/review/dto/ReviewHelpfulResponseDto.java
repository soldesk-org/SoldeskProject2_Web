package com.foodtrip.foodsearch.review.dto;

// 리뷰 "도움됨" 토글 응답(2026-08-12 추가).
public class ReviewHelpfulResponseDto {

    private final long helpfulCount;
    private final boolean helpfulByMe;

    public ReviewHelpfulResponseDto(long helpfulCount, boolean helpfulByMe) {
        this.helpfulCount = helpfulCount;
        this.helpfulByMe = helpfulByMe;
    }

    public long getHelpfulCount() {
        return helpfulCount;
    }

    public boolean isHelpfulByMe() {
        return helpfulByMe;
    }
}
