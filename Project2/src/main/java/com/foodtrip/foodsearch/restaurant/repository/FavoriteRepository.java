package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.restaurant.entity.Favorite;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    boolean existsByMemberIdAndRestaurantId(Long memberId, String restaurantId);

    // 즐겨찾기 등록/해제(마이페이지 11, 2026-07-22 추가) — 토글 처리 시 이미 있는지 확인/삭제할 때 사용.
    Optional<Favorite> findByMemberIdAndRestaurantId(Long memberId, String restaurantId);

    // 마이페이지 "즐겨찾기 목록"(2026-07-22 추가) — 최신 등록순.
    List<Favorite> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    // 목록/검색/주변조회(001-02 5-0장) favorite 필드를 N+1 없이 한 번에 채우기 위한 배치 조회.
    @Query("SELECT f.restaurantId FROM Favorite f WHERE f.memberId = :memberId AND f.restaurantId IN :restaurantIds")
    List<String> findFavoritedRestaurantIds(@Param("memberId") Long memberId, @Param("restaurantIds") List<String> restaurantIds);

    // 사업자 마이페이지 "내 매장 관리"(2026-08-06 추가) — 매장 단위 즐겨찾기 수.
    long countByRestaurantId(String restaurantId);
}
