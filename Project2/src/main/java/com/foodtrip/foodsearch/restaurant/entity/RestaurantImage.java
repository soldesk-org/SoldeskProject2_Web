package com.foodtrip.foodsearch.restaurant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 매장 사진 갤러리(2026-08-06 추가) — Restaurant.imageUrl은 대표 이미지 1장만 담을 수 있어(007 001-02
// 5-0장), 사업자 마이페이지 "사진 관리" 탭(최대 4장, 대표 지정 가능)을 위해 별도 테이블로 분리했다.
// 대표로 지정된 사진의 URL은 계속 Restaurant.imageUrl에도 동기화한다 — 지도 카드 썸네일 등 기존
// 단일 이미지 소비처를 그대로 유지하기 위함.
@Entity
@Table(name = "restaurant_images")
public class RestaurantImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "restaurant_image_id")
    private Long restaurantImageId;

    @Column(name = "restaurant_id", nullable = false, length = 100)
    private String restaurantId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "is_main", nullable = false)
    private boolean isMain;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected RestaurantImage() {
    }

    public static RestaurantImage create(String restaurantId, String imageUrl, boolean isMain) {
        RestaurantImage image = new RestaurantImage();
        image.restaurantId = restaurantId;
        image.imageUrl = imageUrl;
        image.isMain = isMain;
        return image;
    }

    public void markMain() {
        this.isMain = true;
    }

    public void unmarkMain() {
        this.isMain = false;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getRestaurantImageId() {
        return restaurantImageId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isMain() {
        return isMain;
    }
}
