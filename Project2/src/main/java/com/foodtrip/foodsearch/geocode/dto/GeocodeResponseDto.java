package com.foodtrip.foodsearch.geocode.dto;

import java.math.BigDecimal;

// 사업자 회원가입 STEP2(매장 정보)의 주소 검색 → 지도 마커 표시(2026-08-04 신규)에서 쓰는 주소→좌표 변환 결과.
public class GeocodeResponseDto {

    private final BigDecimal latitude;
    private final BigDecimal longitude;
    private final String roadAddress;

    public GeocodeResponseDto(BigDecimal latitude, BigDecimal longitude, String roadAddress) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.roadAddress = roadAddress;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public String getRoadAddress() {
        return roadAddress;
    }
}
