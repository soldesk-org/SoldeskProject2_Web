package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.restaurant.entity.Tag;

public interface TagRepository extends JpaRepository<Tag, Long> {

    // 상세 조회(001-02 5-2장)의 tags 목록용.
    @Query("SELECT t.tagName FROM RestaurantTag rt JOIN Tag t ON t.tagId = rt.tagId "
            + "WHERE rt.restaurantId = :restaurantId ORDER BY rt.restaurantTagId ASC")
    List<String> findTagNamesByRestaurantId(@Param("restaurantId") String restaurantId);
}
