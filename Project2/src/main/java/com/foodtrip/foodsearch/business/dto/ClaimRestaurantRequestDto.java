package com.foodtrip.foodsearch.business.dto;

import jakarta.validation.constraints.NotBlank;

// 매장 자동귀속이 모호했을 때(회원가입 응답의 AMBIGUOUS 후보 목록 중 하나) 사업자가 직접 골라 수동으로
// 귀속하는 요청(2026-08-07 신규).
// 2026-08-10 보안 수정: address/roadAddress는 더 이상 검증에 쓰지 않는다 — 예전엔 클라이언트가 보낸 이
// 값을 그대로 신뢰해서, 조작된 주소로 아무 미귀속 매장이나 가로챌 수 있는 취약점이 있었다. 이제 서버가
// businessName으로 카카오를 다시 검색해 직접 얻은 주소로만 검증한다(RestaurantClaimServiceImpl.
// claimByRestaurantId). 프론트가 기존 화면 표시용으로 이 필드들을 계속 보내도 무해하게 무시된다.
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
