package com.foodtrip.foodsearch.restaurant.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.RestaurantManager;

public interface RestaurantManagerRepository extends JpaRepository<RestaurantManager, Long> {

    boolean existsByRestaurantIdAndMemberIdAndManagerStatus(String restaurantId, Long memberId, String managerStatus);

    boolean existsByRestaurantIdAndMemberId(String restaurantId, Long memberId);

    // 사업자 마이페이지 "내 매장 관리"(2026-08-06 추가) — restaurantId를 모르는 상태에서 로그인한
    // 사업자 회원이 관리하는 매장을 역으로 찾기 위함.
    Optional<RestaurantManager> findFirstByMemberIdAndManagerStatus(Long memberId, String managerStatus);
}
