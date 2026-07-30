package com.foodtrip.foodsearch.restaurant.service;

public interface RestaurantClaimService {

    // 사업자 회원가입 시 사업장 주소로 미소유(UNCLAIMED) 음식점을 자동 귀속 시도한다(2026-07-20 요구사항
    // 추가). 정확히 하나만 매칭되면 귀속하고, 0개/여러 개면 아무것도 하지 않는다(안전한 기본값).
    void tryAutoClaimByAddress(Long memberId, Long businessProfileId, String businessAddress);
}
