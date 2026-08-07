package com.foodtrip.foodsearch.restaurant.dto;

public class RestaurantImageResponseDto {

    private final Long imageId;
    private final String imageUrl;
    private final boolean isMain;

    public RestaurantImageResponseDto(Long imageId, String imageUrl, boolean isMain) {
        this.imageId = imageId;
        this.imageUrl = imageUrl;
        this.isMain = isMain;
    }

    public Long getImageId() {
        return imageId;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isMain() {
        return isMain;
    }
}
