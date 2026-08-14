package com.foodtrip.foodsearch.restaurant.dto;

import java.util.List;

import jakarta.validation.constraints.Size;

// 사업자 등록: 매장 소개/편의시설 수정(2026-08-09 추가) — UpdateRestaurantPhoneRequestDto와 같은 패턴.
public class UpdateRestaurantExtrasRequestDto {

    @Size(max = 500)
    private String description;

    private List<String> amenities;

    @Size(max = 20)
    private String priceRange;

    // 카테고리 수동 지정(2026-08-14 추가) — restaurant_categories.category_code(예: "BUFFET"). 자동
    // 분류가 안 되는 매장에 한해 사업자가 직접 고른 값을 저장한다(서비스 레이어에서 실제 존재하는
    // 코드인지 검증).
    @Size(max = 30)
    private String categoryOverride;

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getAmenities() {
        return amenities;
    }

    public void setAmenities(List<String> amenities) {
        this.amenities = amenities;
    }

    public String getPriceRange() {
        return priceRange;
    }

    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }

    public String getCategoryOverride() {
        return categoryOverride;
    }

    public void setCategoryOverride(String categoryOverride) {
        this.categoryOverride = categoryOverride;
    }
}
