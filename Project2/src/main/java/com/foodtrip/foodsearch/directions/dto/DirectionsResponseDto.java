package com.foodtrip.foodsearch.directions.dto;

import java.util.List;

// 16(길찾기) — NCP Direction 5 응답 중 프론트가 실제로 쓰는 값만 추린 DTO.
public class DirectionsResponseDto {

    private final int distanceM;
    private final long durationMs;
    private final int tollFare;
    private final int taxiFare;
    private final int fuelPrice;
    // [경도, 위도] 순서 좌표 목록 — NCP 응답 원본과 동일한 순서(프론트에서 naver.maps.LatLng(lat,lng)로
    // 뒤집어서 씀, tmp-map-test.html의 기존 Polyline 렌더링 패턴과 동일).
    private final List<double[]> path;

    public DirectionsResponseDto(int distanceM, long durationMs, int tollFare, int taxiFare, int fuelPrice,
                                  List<double[]> path) {
        this.distanceM = distanceM;
        this.durationMs = durationMs;
        this.tollFare = tollFare;
        this.taxiFare = taxiFare;
        this.fuelPrice = fuelPrice;
        this.path = path;
    }

    public int getDistanceM() {
        return distanceM;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public int getTollFare() {
        return tollFare;
    }

    public int getTaxiFare() {
        return taxiFare;
    }

    public int getFuelPrice() {
        return fuelPrice;
    }

    public List<double[]> getPath() {
        return path;
    }
}
