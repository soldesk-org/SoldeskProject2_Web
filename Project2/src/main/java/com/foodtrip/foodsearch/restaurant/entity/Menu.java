package com.foodtrip.foodsearch.restaurant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// 사업자가 등록해야 채워지는 값(001-02 1-0장). 등록/수정/삭제 API는 2026-07-20 추가(RestaurantOwnerServiceImpl 참고).
@Entity
@Table(name = "menus")
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menu_id")
    private Long menuId;

    @Column(name = "restaurant_id", nullable = false)
    private String restaurantId;

    @Column(name = "menu_name", nullable = false, length = 200)
    private String menuName;

    @Column(name = "price", nullable = false)
    private Integer price;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_signature", nullable = false)
    private Boolean isSignature;

    @Column(name = "is_available", nullable = false)
    private Boolean isAvailable;

    @Column(name = "is_owner_verified", nullable = false)
    private Boolean isOwnerVerified;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected Menu() {
    }

    // 사업자가 등록한 메뉴는 항상 is_owner_verified=1(본인 소유 음식점 확인된 상태에서만 이 메서드가
    // 호출되므로), is_available=1(등록 즉시 판매중)로 시작한다.
    public static Menu create(String restaurantId, String menuName, Integer price, String description, boolean isSignature) {
        Menu menu = new Menu();
        menu.restaurantId = restaurantId;
        menu.menuName = menuName;
        menu.price = price;
        menu.description = description;
        menu.isSignature = isSignature;
        menu.isAvailable = true;
        menu.isOwnerVerified = true;
        return menu;
    }

    public void update(String menuName, Integer price, String description, boolean isSignature, boolean isAvailable) {
        this.menuName = menuName;
        this.price = price;
        this.description = description;
        this.isSignature = isSignature;
        this.isAvailable = isAvailable;
    }

    public void markDeleted() {
        this.deletedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getMenuId() {
        return menuId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getMenuName() {
        return menuName;
    }

    public Integer getPrice() {
        return price;
    }

    public String getDescription() {
        return description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Boolean getIsSignature() {
        return isSignature;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }

    public Boolean getIsOwnerVerified() {
        return isOwnerVerified;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }
}
