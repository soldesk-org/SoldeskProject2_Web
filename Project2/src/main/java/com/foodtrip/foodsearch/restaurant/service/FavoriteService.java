package com.foodtrip.foodsearch.restaurant.service;

import com.foodtrip.foodsearch.restaurant.dto.FavoriteAddRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.FavoriteResponseDto;

public interface FavoriteService {

    FavoriteResponseDto add(String restaurantId, String authorizationHeader, FavoriteAddRequestDto request);

    FavoriteResponseDto remove(String restaurantId, String authorizationHeader);
}
