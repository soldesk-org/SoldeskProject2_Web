package com.foodtrip.foodsearch.restaurant.service;

import com.foodtrip.foodsearch.restaurant.dto.RestaurantClaimResult;

public interface RestaurantClaimService {

    // 사업자 회원가입 시 사업장 주소+가게명으로 미소유(UNCLAIMED) 음식점을 자동 귀속 시도한다
    // (2026-07-20 요구사항 추가, 2026-08-07 가게명 매칭 추가). 주소가 일치하는 카카오 후보 중 가게명까지
    // 일치하는 게 정확히 하나면 귀속하고(CLAIMED), 0개면 NOT_FOUND, 여러 개면 AMBIGUOUS로 후보 목록을
    // 돌려준다(프론트가 안내해서 수동 귀속하도록).
    RestaurantClaimResult tryAutoClaim(Long memberId, Long businessProfileId, String businessAddress, String storeName);

    // 자동귀속이 모호(0개/여러 개)했을 때 프론트가 후보 중 하나를 직접 골라 수동으로 귀속하는 경로
    // (2026-08-07 신규, BusinessDashboardService.claimRestaurant 참고). 2026-08-10 보안 수정: 예전에는
    // 프론트가 보낸 candidateAddress/candidateRoadAddress 문자열을 그대로 신뢰해서, 클라이언트가 그
    // 값을 조작하면 임의의(아직 미귀속인) 매장을 주소 검증 없이 가로챌 수 있었다. 이제는 그 값을 받지
    // 않고, 서버가 businessName으로 카카오를 다시 검색해 직접 얻은 주소로만 검증한다(카카오가 place id
    // 단건 재조회를 지원하지 않아 tryAutoClaim()과 동일하게 키워드 검색 결과에서 id로 찾는다).
    void claimByRestaurantId(Long memberId, Long businessProfileId, String businessAddress,
                              String businessName, String restaurantId);
}
