package com.foodtrip.foodsearch.restaurant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 사업자 등록: 음식점 전화번호 수정(2026-07-20 추가).
public class UpdateRestaurantPhoneRequestDto {

    @NotBlank
    @Size(max = 20)
    private String phone;

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
