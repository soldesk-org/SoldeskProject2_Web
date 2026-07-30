package com.foodtrip.foodsearch.restaurant.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

// 사업자 등록: 영업시간 전체 교체(2026-07-20 추가) — 요일별 개별 수정 API 대신 한 번에 통째로 갈아끼운다.
public class UpdateBusinessHoursRequestDto {

    @NotEmpty
    @Valid
    private List<BusinessHourItemDto> businessHours;

    public List<BusinessHourItemDto> getBusinessHours() {
        return businessHours;
    }

    public void setBusinessHours(List<BusinessHourItemDto> businessHours) {
        this.businessHours = businessHours;
    }
}
