package com.foodtrip.foodsearch.restaurant.service;

import com.foodtrip.foodsearch.restaurant.dto.RestaurantClaimResult;

public interface RestaurantClaimService {

    // 사업자 회원가입 시 사업장 주소+가게명으로 미소유(UNCLAIMED) 음식점을 자동 귀속 시도한다
    // (2026-07-20 요구사항 추가, 2026-08-07 가게명 매칭 추가). 주소가 일치하는 카카오 후보 중 가게명까지
    // 일치하는 게 정확히 하나면 귀속하고(CLAIMED), 0개면 NOT_FOUND, 여러 개면 AMBIGUOUS로 후보 목록을
    // 돌려준다(프론트가 안내해서 수동 귀속하도록).
    RestaurantClaimResult tryAutoClaim(Long memberId, Long businessProfileId, String businessAddress, String storeName);

    // 자동귀속이 모호(0개/여러 개)했을 때 프론트가 후보 중 하나를 직접 골라 수동으로 귀속하는 경로
    // (2026-08-07 신규, BusinessDashboardService.claimRestaurant 참고). candidateAddress/candidateRoadAddress는
    // 프론트가 검색 결과에서 이미 들고 있는 값을 그대로 넘긴다(카카오가 place id 단건 재조회를 지원하지
    // 않으므로) — 그 값이 사업장 주소와 실제로 일치하는지 서버가 다시 검증한다.
    void claimByRestaurantId(Long memberId, Long businessProfileId, String businessAddress,
                              String restaurantId, String candidateAddress, String candidateRoadAddress);
}
