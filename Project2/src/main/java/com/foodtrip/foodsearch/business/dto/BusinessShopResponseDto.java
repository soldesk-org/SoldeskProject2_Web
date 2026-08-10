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
    // 2026-08-09 추가 — 매장 소개/편의시설도 phone과 동일하게 사업자가 직접 저장하기 전까진 비어있다.
    private final String description;
    private final List<String> amenities;
    // 2026-08-10 추가 — 1인 평균 가격대(under10000/10000-20000/20000-40000/over40000).
    private final String priceRange;
    // 2026-08-10 추가 — 임시 휴업 토글의 실제 저장값. 새로고침해도 토글 상태가 유지되도록 응답에 포함한다.
    private final boolean tempClosed;

    public BusinessShopResponseDto(String restaurantId, String imageUrl, String businessName,
                                    String businessAddress, String businessRegistrationNumber,
                                    String phone, List<BusinessHourResponseDto> businessHours,
                                    String description, List<String> amenities, String priceRange,
                                    boolean tempClosed) {
        this.restaurantId = restaurantId;
        this.imageUrl = imageUrl;
        this.businessName = businessName;
        this.businessAddress = businessAddress;
        this.businessRegistrationNumber = businessRegistrationNumber;
        this.phone = phone;
        this.businessHours = businessHours;
        this.description = description;
        this.amenities = amenities;
        this.priceRange = priceRange;
        this.tempClosed = tempClosed;
    }

    public boolean isTempClosed() {
        return tempClosed;
    }

    public String getDescription() {
        return description;
    }

    public List<String> getAmenities() {
        return amenities;
    }

    public String getPriceRange() {
        return priceRange;
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
