package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.RestaurantBusinessHour;

public interface RestaurantBusinessHourRepository extends JpaRepository<RestaurantBusinessHour, Long> {

    List<RestaurantBusinessHour> findByRestaurantIdOrderByDayOfWeekAsc(String restaurantId);

    // 영업시간 등록(2026-07-20 추가)은 요일 7개를 통째로 교체하는 방식이라(RestaurantOwnerServiceImpl),
    // 새로 넣기 전에 기존 행을 전부 지운다.
    void deleteByRestaurantId(String restaurantId);
}
