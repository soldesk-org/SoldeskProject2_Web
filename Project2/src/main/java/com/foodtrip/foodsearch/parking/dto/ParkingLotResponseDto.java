package com.foodtrip.foodsearch.parking.dto;

import java.math.BigDecimal;

public class ParkingLotResponseDto {

    private final Long parkingLotId;
    private final String name;
    private final String address;
    private final BigDecimal latitude;
    private final BigDecimal longitude;
    private final long distanceM;
    private final Integer totalSpaces;
    // "무료"/"유료"/"정보없음" — 기본요금(baseFee) 값으로 추정한 것일 뿐 API가 명시적으로 주는 값이
    // 아니다(ParkingLot 001-02 2-3장 참고, 100% 정확하지 않을 수 있음).
    private final String feeType;
    private final String feeSummary;

    public ParkingLotResponseDto(Long parkingLotId, String name, String address, BigDecimal latitude,
                                  BigDecimal longitude, long distanceM, Integer totalSpaces, String feeType,
                                  String feeSummary) {
        this.parkingLotId = parkingLotId;
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.distanceM = distanceM;
        this.totalSpaces = totalSpaces;
        this.feeType = feeType;
        this.feeSummary = feeSummary;
    }

    public Long getParkingLotId() {
        return parkingLotId;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public long getDistanceM() {
        return distanceM;
    }

    public Integer getTotalSpaces() {
        return totalSpaces;
    }

    public String getFeeType() {
        return feeType;
    }

    public String getFeeSummary() {
        return feeSummary;
    }
}
