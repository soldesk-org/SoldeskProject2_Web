package com.foodtrip.foodsearch.review.dto;

public class ReviewImageResponseDto {

    private final Long reviewImageId;
    private final String imageUrl;

    public ReviewImageResponseDto(Long reviewImageId, String imageUrl) {
        this.reviewImageId = reviewImageId;
        this.imageUrl = imageUrl;
    }

    public Long getReviewImageId() {
        return reviewImageId;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
