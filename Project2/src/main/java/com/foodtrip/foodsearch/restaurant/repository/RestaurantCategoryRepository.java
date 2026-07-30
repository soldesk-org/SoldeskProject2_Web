package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.RestaurantCategory;

public interface RestaurantCategoryRepository extends JpaRepository<RestaurantCategory, Long> {

    Optional<RestaurantCategory> findByCategoryName(String categoryName);

    Optional<RestaurantCategory> findByCategoryCode(String categoryCode);

    // 카테고리 버튼 목록 조회(2026-07-21 추가)용 — 표시 순서대로.
    List<RestaurantCategory> findAllByOrderByDisplayOrderAsc();
}
