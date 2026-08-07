package com.foodtrip.foodsearch.business.dto;

import java.util.List;

import com.foodtrip.foodsearch.restaurant.dto.BusinessHourResponseDto;

// 사업자 마이페이지 "내 매장 관리"(2026-08-06 추가) — GET /api/business/me/shop.
// 로그인한 사업자가 관리하는 restaurantId(카카오 place id)를 알려준다. 메뉴/사진 관리, 고객 화면 보기
// 링크 생성 등 restaurantId가 필요한 나머지 API 호출은 전부 이 값을 먼저 받아와야 가능하다.
// phone/businessHours는 사업자가 직접 등록해야만 채워지는 값 — 매장이 처음 귀속된 시점엔 비어있고
// (지어낸 기본값 없음), "매장 정보" 탭에서 실제로 저장해야 채워지는 흐름이다(2026-08-06 정리).
public class BusinessShopResponseDto {

    private final String restaurantId;
    private final String imageUrl;
    private final String businessName;
    private final String businessAddress;
    private final String businessRegistrationNumber;
    private final String phone;
    private final List<BusinessHourResponseDto> businessHours;

    public BusinessShopResponseDto(String restaurantId, String imageUrl, String businessName,
                                    String businessAddress, String businessRegistrationNumber,
                                    String phone, List<BusinessHourResponseDto> businessHours) {
        this.restaurantId = restaurantId;
        this.imageUrl = imageUrl;
        this.businessName = businessName;
        this.businessAddress = businessAddress;
        this.businessRegistrationNumber = businessRegistrationNumber;
        this.phone = phone;
        this.businessHours = businessHours;
    }

    public String getPhone() {
        return phone;
    }

    public List<BusinessHourResponseDto> getBusinessHours() {
        return businessHours;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getBusinessName() {
        return businessName;
    }

    public String getBusinessAddress() {
        return businessAddress;
    }

    public String getBusinessRegistrationNumber() {
        return businessRegistrationNumber;
    }
}
