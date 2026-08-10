package com.foodtrip.foodsearch.restaurant.dto;

// 사업자 마이페이지 "임시 휴업" 토글(2026-08-10 추가) — UpdateRestaurantPhoneRequestDto와 같은 패턴.
public class UpdateRestaurantOpenStatusRequestDto {

    private boolean tempClosed;

    public boolean isTempClosed() {
        return tempClosed;
    }

    public void setTempClosed(boolean tempClosed) {
        this.tempClosed = tempClosed;
    }
}
