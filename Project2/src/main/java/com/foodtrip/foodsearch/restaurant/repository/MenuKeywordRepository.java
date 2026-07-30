package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.MenuKeyword;

public interface MenuKeywordRepository extends JpaRepository<MenuKeyword, Long> {

    // 카테고리 자동분류(RestaurantCategoryMatchingService)에 쓰는 키워드만 — category_code가 없는
    // 교차-카테고리 키워드는 분류에 쓰지 않는다(MenuKeyword 주석 참고).
    List<MenuKeyword> findByIsActiveTrueAndCategoryCodeIsNotNull();
}
