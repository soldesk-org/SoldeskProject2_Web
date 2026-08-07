package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.RestaurantImage;

public interface RestaurantImageRepository extends JpaRepository<RestaurantImage, Long> {

    List<RestaurantImage> findByRestaurantIdOrderByIsMainDescCreatedAtAsc(String restaurantId);

    long countByRestaurantId(String restaurantId);

    Optional<RestaurantImage> findByRestaurantImageIdAndRestaurantId(Long restaurantImageId, String restaurantId);
}
