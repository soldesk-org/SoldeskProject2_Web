package com.foodtrip.foodsearch.restaurant.dto;

public class FavoriteResponseDto {

    private final boolean success;
    private final boolean favorite;

    public FavoriteResponseDto(boolean success, boolean favorite) {
        this.success = success;
        this.favorite = favorite;
    }

    public boolean isSuccess() {
        return success;
    }

    public boolean isFavorite() {
        return favorite;
    }
}
