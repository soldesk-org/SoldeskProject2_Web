package com.foodtrip.foodsearch.restaurant.dto;

import java.util.List;

import jakarta.validation.constraints.Size;

// 사업자 등록: 매장 소개/편의시설 수정(2026-08-09 추가) — UpdateRestaurantPhoneRequestDto와 같은 패턴.
public class UpdateRestaurantExtrasRequestDto {

    @Size(max = 500)
    private String description;

    private List<String> amenities;

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
}
