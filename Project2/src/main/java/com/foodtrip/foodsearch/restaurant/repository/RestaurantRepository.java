package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.Restaurant;

// 2026-07-21 전면 재설계: restaurant_id가 카카오 로컬 API place id(문자열)이고, 이 테이블은 "우리 서비스
// 부가정보"만 담는다(Restaurant 엔티티 참고). 상호명/주소/좌표 기반 검색은 더 이상 이 테이블에 SQL로
// 걸지 않고, 카카오 라이브 호출 결과를 애플리케이션(RestaurantServiceImpl)에서 이 저장소의 부가정보와
// 병합하는 방식으로 처리한다.
public interface RestaurantRepository extends JpaRepository<Restaurant, String> {

    Optional<Restaurant> findByRestaurantIdAndDeletedAtIsNull(String restaurantId);

    // 사업장 주소 자동귀속(RestaurantClaimServiceImpl) 후보 조회용 — 더 이상 주소로 후보를 좁히지 않고
    // 카카오 라이브 검색으로 후보를 찾으므로 이 메서드는 관리자 화면 등 다른 용도로 남겨둔다.
    List<Restaurant> findByManagementStatusAndDeletedAtIsNull(String managementStatus);
}
