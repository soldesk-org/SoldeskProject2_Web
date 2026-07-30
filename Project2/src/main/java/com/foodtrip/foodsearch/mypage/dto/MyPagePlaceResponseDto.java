package com.foodtrip.foodsearch.mypage.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// 즐겨찾기(11-2장)/방문기록(11-3장) 공용 응답 — 둘 다 "음식점 스냅샷 + 시각" 형태라 하나로 공유한다.
public class MyPagePlaceResponseDto {

    private final String restaurantId;
    private final String name;
    private final String address;
    private final String roadAddress;
    private final BigDecimal latitude;
    private final BigDecimal longitude;
    private final LocalDateTime recordedAt;

    public MyPagePlaceResponseDto(String restaurantId, String name, String address, String roadAddress,
                                   BigDecimal latitude, BigDecimal longitude, LocalDateTime recordedAt) {
        this.restaurantId = restaurantId;
        this.name = name;
        this.address = address;
        this.roadAddress = roadAddress;
        this.latitude = latitude;
        this.longitude = longitude;
        this.recordedAt = recordedAt;
    }

    public String getRestaurantId() {
        return restaurantId;
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

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }
}
