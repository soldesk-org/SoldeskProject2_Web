package com.foodtrip.foodsearch.restaurant.dto;

// 사업자 회원가입 시 매장 자동귀속이 모호(0개/여러 개)할 때, 회원가입 응답에 실어 보내는 후보 목록
// (2026-08-07, RestaurantClaimServiceImpl 참고) — 이후 프론트가 그중 하나를 골라
// POST /api/business/claim-restaurant로 수동 귀속할 때도 같은 모양을 그대로 재사용한다.
public class RestaurantCandidateDto {

    private final String restaurantId;
    private final String name;
    private final String address;
    private final String roadAddress;

    public RestaurantCandidateDto(String restaurantId, String name, String address, String roadAddress) {
        this.restaurantId = restaurantId;
        this.name = name;
        this.address = address;
        this.roadAddress = roadAddress;
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
}
