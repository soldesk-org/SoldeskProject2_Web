package com.foodtrip.foodsearch.restaurant.dto;

// 카테고리 버튼 목록용(2026-07-21 추가) — categoryId는 환경마다 auto-increment 값이 달라질 수 있어
// 프론트가 하드코딩하지 않고 이 API로 받아써야 한다.
public class CategoryResponseDto {

    private final Long categoryId;
    private final String categoryCode;
    private final String categoryName;

    public CategoryResponseDto(Long categoryId, String categoryCode, String categoryName) {
        this.categoryId = categoryId;
        this.categoryCode = categoryCode;
        this.categoryName = categoryName;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getCategoryCode() {
        return categoryCode;
    }

    public String getCategoryName() {
        return categoryName;
    }
}
