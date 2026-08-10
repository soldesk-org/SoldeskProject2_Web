package com.foodtrip.foodsearch.review.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 리뷰 사진(2026-08-10 추가) — 리뷰 작성 시 최대 3장까지 첨부. RestaurantImage/ReceiptImage와 같은 패턴
// (로컬 디스크 저장 + UUID 파일명), 대표 이미지 개념 없이 등록 순서대로 전부 노출한다.
@Entity
@Table(name = "review_images")
public class ReviewImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_image_id")
    private Long reviewImageId;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ReviewImage() {
    }

    public static ReviewImage create(Long reviewId, String imageUrl) {
        ReviewImage image = new ReviewImage();
        image.reviewId = reviewId;
        image.imageUrl = imageUrl;
        return image;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getReviewImageId() {
        return reviewImageId;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
