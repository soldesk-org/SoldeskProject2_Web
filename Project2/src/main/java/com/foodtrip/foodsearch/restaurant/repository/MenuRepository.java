package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.restaurant.entity.Menu;

public interface MenuRepository extends JpaRepository<Menu, Long> {

    // 대표메뉴 먼저 → 가격 낮은 순(001-02 6장 잠정 정렬 기준).
    List<Menu> findByRestaurantIdAndIsAvailableTrueAndDeletedAtIsNullOrderByIsSignatureDescPriceAsc(String restaurantId);

    // 사업자 등록(2026-07-20 추가) 수정/삭제 시 "이 메뉴가 정말 이 음식점 소속인지"까지 함께 확인하는
    // 조회 — restaurantId를 조건에 포함시켜, 다른 음식점 메뉴의 menuId를 넣어도 못 건드리게 막는다.
    Optional<Menu> findByMenuIdAndRestaurantIdAndDeletedAtIsNull(Long menuId, String restaurantId);

    // 음식 검색(2026-07-21 추가) — "김치찌개"처럼 메뉴명으로 검색하면, 그 메뉴를 파는 음식점의 id를
    // 돌려준다. 메뉴는 사업자가 직접 등록한 우리 데이터라(카카오가 주는 값이 아님) DB에서 바로 검색해도
    // 문제 없다(RestaurantServiceImpl.search()가 이 id들을 지금 지도 범위의 카카오 라이브 결과와 교집합해서
    // 좌표를 채운다 — 카카오 단건 재조회가 안 되므로 이 방식으로만 지도에 표시 가능).
    @Query("SELECT DISTINCT m.restaurantId FROM Menu m WHERE m.deletedAt IS NULL AND m.isAvailable = true "
            + "AND m.menuName LIKE CONCAT('%', :keyword, '%')")
    Set<String> findRestaurantIdsByMenuNameContaining(@Param("keyword") String keyword);
}
