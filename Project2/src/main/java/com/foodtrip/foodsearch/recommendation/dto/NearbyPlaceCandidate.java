package com.foodtrip.foodsearch.recommendation.dto;

// 카카오 로컬 API(카페/공원 근처 검색) 원본 응답 중 이 기능이 쓰는 필드만 뽑은 것 — 07의
// KakaoLocalSearchItem과 별개로 둔다(거리(distanceMeters)가 필요하고, 검색 대상도 음식점/카페 한정이
// 아니라 공원까지 포함해야 해서 07의 기존 필터링 로직을 그대로 재사용하기 애매함, 001-02 참고).
public record NearbyPlaceCandidate(
        String placeId,
        String placeName,
        String categoryName,
        String addressName,
        String roadAddressName,
        String placeUrl,
        String x,
        String y,
        Integer distanceMeters) {
}
