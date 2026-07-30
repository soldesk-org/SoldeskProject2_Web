package com.foodtrip.foodsearch.restaurant.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.RestaurantManager;

public interface RestaurantManagerRepository extends JpaRepository<RestaurantManager, Long> {

    boolean existsByRestaurantIdAndMemberIdAndManagerStatus(String restaurantId, Long memberId, String managerStatus);

    boolean existsByRestaurantIdAndMemberId(String restaurantId, Long memberId);
}
