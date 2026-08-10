package com.foodtrip.foodsearch.restaurant.dto;

import jakarta.validation.constraints.Size;

// 사업자 등록: 음식점 전화번호 수정(2026-07-20 추가). 전화번호는 필수 입력이 아니다(2026-08-10부터,
// 매장 정보 저장 전체가 막히는 걸 막기 위해 필수 해제) — 빈 값으로 저장하면 "정보 없음"으로 노출된다.
public class UpdateRestaurantPhoneRequestDto {

    @Size(max = 20)
    private String phone;

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
