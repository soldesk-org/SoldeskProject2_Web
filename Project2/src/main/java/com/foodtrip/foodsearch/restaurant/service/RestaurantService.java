package com.foodtrip.foodsearch.restaurant.service;

import java.math.BigDecimal;
import java.util.List;

import com.foodtrip.foodsearch.restaurant.dto.CategoryResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantDetailResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantListResponseDto;

// 2026-07-21 전면 재설계: 카카오 로컬 API 운영정책상 검색 결과를 저장할 수 없어(001-05 참고, 카카오
// 데브톡 공식 답변), list/search/filter/nearby 전부 매 요청마다 카카오를 실시간으로 호출하고 우리
// DB(부가정보, Restaurant 엔티티 참고)와 병합해서 응답한다.
public interface RestaurantService {

    // 위치 없는 "전체 목록"은 카카오 로컬 API로 낼 방법이 없어(001-05) 빈 목록을 반환한다 — 실제 목록
    // 조회는 search()/filter()의 bbox로 한다.
    RestaurantListResponseDto list(int page, int size, String authorizationHeader);

    // 카테고리 버튼 목록(2026-07-21 추가) — categoryId가 환경마다 달라질 수 있어 프론트가 하드코딩하지
    // 않고 이 API로 받아쓴다.
    List<CategoryResponseDto> listCategories();

    // 검색(1-1장, 2026-07-20 필터와 분리) — keyword 전용, 카카오 키워드 검색을 라이브로 호출한다.
    // bbox(minLat/maxLat/minLng/maxLng) 4개는 전부 null이면 전국 범위, 전부 있으면 그 사각형(지도
    // 뷰포트) 안으로만 결과를 좁힌다.
    // openNow(2026-08-03 추가) — true면 사업자가 영업시간을 등록한 가게 중 "지금 시각 기준 영업중"인
    // 곳만 남긴다. 영업시간 미등록 가게는(우리 DB에 영업시간이 없어 열려있는지 알 방법이 없음) minPrice/
    // maxPrice가 메뉴 미등록 가게를 빼는 것과 같은 이유로 함께 제외한다.
    // type(2026-08-03 추가) — all(기본)|shop(가게명만, 카카오 라이브 검색)|menu(메뉴명만, 우리 DB 메뉴 매칭).
    RestaurantListResponseDto search(String keyword, BigDecimal minLat, BigDecimal maxLat,
                                      BigDecimal minLng, BigDecimal maxLng, Boolean openNow, String type,
                                      int page, int size, String authorizationHeader);

    // 필터(1-1장, 2026-07-20 신규) — categoryId/minPrice/maxPrice 전용, 카카오 카테고리(bbox) 검색을
    // 라이브로 호출한다. bbox 4개는 이제 필수다(카카오가 좌표 기준 검색만 지원하므로, 001-05 참고).
    RestaurantListResponseDto filter(Long categoryId, Integer minPrice, Integer maxPrice,
                                      BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng,
                                      Boolean openNow, int page, int size, String authorizationHeader);

    // 상세 조회 — 카카오는 place id 단건 재조회를 지원하지 않아(001-05), 프론트가 검색 결과에서 이미
    // 들고 있는 상호명/주소/좌표/전화번호를 그대로 넘겨받아 우리 DB의 부가정보(설명/사진/평점/메뉴/
    // 영업시간)와 합쳐서 응답한다. name이 null이면(스냅샷 없이 id만 아는 경우) 그 필드들은 null로 내려간다.
    RestaurantDetailResponseDto getDetail(String restaurantId, String authorizationHeader,
                                           String name, String address, String roadAddress,
                                           BigDecimal latitude, BigDecimal longitude);

    RestaurantListResponseDto nearby(BigDecimal latitude, BigDecimal longitude, Double radiusKm, String authorizationHeader);
}
