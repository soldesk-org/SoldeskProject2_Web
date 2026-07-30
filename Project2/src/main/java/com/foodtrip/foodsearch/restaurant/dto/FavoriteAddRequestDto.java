package com.foodtrip.foodsearch.restaurant.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;

// 즐겨찾기 등록(마이페이지 11, 2026-07-22 추가) — 08(영수증OCR)/리뷰 스냅샷과 같은 이유로, 목록 표시에
// 필요한 값을 프론트가 함께 보낸다(Favorite 엔티티 주석 참고).
public class FavoriteAddRequestDto {

    @NotBlank(message = "name은 필수입니다.")
    private String name;

    private String address;
    private String roadAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;

    protected FavoriteAddRequestDto() {
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getRoadAddress() {
        return roadAddress;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }
}
