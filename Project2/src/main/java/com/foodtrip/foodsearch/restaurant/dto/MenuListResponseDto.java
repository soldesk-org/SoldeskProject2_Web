package com.foodtrip.foodsearch.restaurant.dto;

import java.util.List;

public class MenuListResponseDto {

    private final boolean success = true;
    private final String restaurantId;
    private final List<MenuResponseDto> menus;

    public MenuListResponseDto(String restaurantId, List<MenuResponseDto> menus) {
        this.restaurantId = restaurantId;
        this.menus = menus;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public List<MenuResponseDto> getMenus() {
        return menus;
    }
}
