package com.foodtrip.foodsearch.restaurant.dto;

public class MenuResponseDto {

    private final Long menuId;
    private final String menuName;
    private final Integer price;
    private final String description;
    private final String imageUrl;
    private final boolean isSignature;

    public MenuResponseDto(Long menuId, String menuName, Integer price, String description,
                            String imageUrl, boolean isSignature) {
        this.menuId = menuId;
        this.menuName = menuName;
        this.price = price;
        this.description = description;
        this.imageUrl = imageUrl;
        this.isSignature = isSignature;
    }

    public Long getMenuId() {
        return menuId;
    }

    public String getMenuName() {
        return menuName;
    }

    public Integer getPrice() {
        return price;
    }

    public String getDescription() {
        return description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isSignature() {
        return isSignature;
    }
}
