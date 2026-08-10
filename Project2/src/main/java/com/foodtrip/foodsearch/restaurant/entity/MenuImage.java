package com.foodtrip.foodsearch.restaurant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 메뉴 사진(2026-08-10 추가, 최대 3장) — review_images와 동일한 패턴(로컬 디스크 저장 + UUID 파일명),
// 대표 이미지 개념 없이 등록 순서대로 전부 노출한다. 처음엔 Menu.imageUrl 단일 컬럼이었는데, "사진을
// 3장까지 넣고 싶다"는 요청으로 리뷰 사진과 같은 구조로 전환했다.
@Entity
@Table(name = "menu_images")
public class MenuImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menu_image_id")
    private Long menuImageId;

    @Column(name = "menu_id", nullable = false)
    private Long menuId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected MenuImage() {
    }

    public static MenuImage create(Long menuId, String imageUrl) {
        MenuImage image = new MenuImage();
        image.menuId = menuId;
        image.imageUrl = imageUrl;
        return image;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getMenuImageId() {
        return menuImageId;
    }

    public Long getMenuId() {
        return menuId;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
