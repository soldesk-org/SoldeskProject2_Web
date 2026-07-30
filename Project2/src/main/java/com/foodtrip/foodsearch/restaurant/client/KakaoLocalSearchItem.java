package com.foodtrip.foodsearch.restaurant.client;

import java.math.BigDecimal;

// 카카오 로컬 API "카테고리로 장소 검색"(category.json) 응답 documents[] 중 이 프로젝트가 쓰는 필드만
// 뽑아온 것. id(카카오 place id)가 원본 데이터의 자연키라 external_place_id로 그대로 쓸 수 있어
// 네이버 동기화(NaverLocalSearchClient)처럼 해시를 만들 필요가 없다(SmbizStoreClient의 bizesId와 같은 패턴).
public record KakaoLocalSearchItem(
        String id,
        String placeName,
        String categoryName,
        String phone,
        String addressName,
        String roadAddressName,
        String placeUrl,
        BigDecimal longitude,
        BigDecimal latitude) {
}
