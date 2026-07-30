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

@Entity
@Table(name = "restaurant_categories")
public class RestaurantCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name", nullable = false, unique = true, length = 50)
    private String categoryName;

    // 팀 공식 카테고리 목록(web_menu_keyword_db.xlsx의 restaurant_category 시트, 2026-07-21 도입)의
    // 영문 코드(예: "KOREAN") — menu_keywords.category_code와 이 값으로 매칭한다.
    @Column(name = "category_code", unique = true, length = 30)
    private String categoryCode;

    @Column(name = "parent_category_id")
    private Long parentCategoryId;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected RestaurantCategory() {
    }

    // 팀 공식 카테고리 목록 시드(2026-07-21, RestaurantCategorySeeder 참고)용.
    public static RestaurantCategory createOfficial(String categoryCode, String categoryName, int displayOrder) {
        RestaurantCategory category = new RestaurantCategory();
        category.categoryCode = categoryCode;
        category.categoryName = categoryName;
        category.displayOrder = displayOrder;
        return category;
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

    public Long getCategoryId() {
        return categoryId;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public Long getParentCategoryId() {
        return parentCategoryId;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }
}
