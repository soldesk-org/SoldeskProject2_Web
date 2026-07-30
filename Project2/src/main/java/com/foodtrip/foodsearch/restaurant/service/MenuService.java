package com.foodtrip.foodsearch.restaurant.service;

import com.foodtrip.foodsearch.restaurant.dto.MenuListResponseDto;

public interface MenuService {

    MenuListResponseDto getMenus(String restaurantId);
}
