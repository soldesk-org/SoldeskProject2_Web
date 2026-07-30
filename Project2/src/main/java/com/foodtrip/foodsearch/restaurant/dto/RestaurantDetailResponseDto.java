package com.foodtrip.foodsearch.restaurant.dto;

import java.math.BigDecimal;
import java.util.List;

// 상세 조회(001-02 5-2장). businessHours/menus는 사업자가 등록하지 않았으면 빈 배열로 내려간다(1-0장/2-2-4장).
public class RestaurantDetailResponseDto {

    private final boolean success = true;
    private final String restaurantId;
    private final String name;
    private final String category;
    private final String description;
    private final String roadAddress;
    private final String address;
    private final BigDecimal latitude;
    private final BigDecimal longitude;
    private final String phone;
    private final String naverPlaceUrl;
    private final String imageUrl;
    private final String businessStatus;
    private final BigDecimal averageRating;
    private final Integer reviewCount;
    private final boolean favorite;
    private final List<String> categories;
    private final List<String> tags;
    private final List<BusinessHourResponseDto> businessHours;
    private final List<MenuResponseDto> menus;

    public RestaurantDetailResponseDto(String restaurantId, String name, String category, String description,
                                        String roadAddress, String address, BigDecimal latitude, BigDecimal longitude,
                                        String phone, String naverPlaceUrl, String imageUrl, String businessStatus,
                                        BigDecimal averageRating, Integer reviewCount, boolean favorite,
                                        List<String> categories, List<String> tags,
                                        List<BusinessHourResponseDto> businessHours, List<MenuResponseDto> menus) {
        this.restaurantId = restaurantId;
        this.name = name;
        this.category = category;
        this.description = description;
        this.roadAddress = roadAddress;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.phone = phone;
        this.naverPlaceUrl = naverPlaceUrl;
        this.imageUrl = imageUrl;
        this.businessStatus = businessStatus;
        this.averageRating = averageRating;
        this.reviewCount = reviewCount;
        this.favorite = favorite;
        this.categories = categories;
        this.tags = tags;
        this.businessHours = businessHours;
        this.menus = menus;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public String getRoadAddress() {
        return roadAddress;
    }

    public String getAddress() {
        return address;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public String getPhone() {
        return phone;
    }

    public String getNaverPlaceUrl() {
        return naverPlaceUrl;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getBusinessStatus() {
        return businessStatus;
    }

    public BigDecimal getAverageRating() {
        return averageRating;
    }

    public Integer getReviewCount() {
        return reviewCount;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public List<String> getCategories() {
        return categories;
    }

    public List<String> getTags() {
        return tags;
    }

    public List<BusinessHourResponseDto> getBusinessHours() {
        return businessHours;
    }

    public List<MenuResponseDto> getMenus() {
        return menus;
    }
}
