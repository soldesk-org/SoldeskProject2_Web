package com.foodtrip.foodsearch.restaurant.dto;

public class MenuImageResponseDto {

    private final Long menuImageId;
    private final String imageUrl;

    public MenuImageResponseDto(Long menuImageId, String imageUrl) {
        this.menuImageId = menuImageId;
        this.imageUrl = imageUrl;
    }

    public Long getMenuImageId() {
        return menuImageId;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
