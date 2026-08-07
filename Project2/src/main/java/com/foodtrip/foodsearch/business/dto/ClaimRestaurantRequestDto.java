package com.foodtrip.foodsearch.business.dto;

import jakarta.validation.constraints.NotBlank;

// 매장 자동귀속이 모호했을 때(회원가입 응답의 AMBIGUOUS 후보 목록 중 하나) 사업자가 직접 골라 수동으로
// 귀속하는 요청(2026-08-07 신규). address/roadAddress는 카카오가 place id 단건 재조회를 지원하지 않아
// 프론트가 검색 결과에서 이미 들고 있는 값을 그대로 넘긴다 — 서버가 사업장 주소와 실제로 일치하는지 다시
// 검증한다(RestaurantClaimServiceImpl.claimByRestaurantId).
public class ClaimRestaurantRequestDto {

    @NotBlank(message = "restaurantId는 필수입니다.")
    private String restaurantId;

    private String address;

    private String roadAddress;

    public String getRestaurantId() {
        return restaurantId;
    }

    public void setRestaurantId(String restaurantId) {
        this.restaurantId = restaurantId;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getRoadAddress() {
        return roadAddress;
    }

    public void setRoadAddress(String roadAddress) {
        this.roadAddress = roadAddress;
    }
}
