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
    // 매장 사진 갤러리(2026-08-06 추가) — 대표 이미지가 항상 0번(imageUrl과 동일). 사업자가 갤러리를
    // 안 썼거나(레거시 단일 이미지만 있는 경우) 사진이 아예 없으면 빈 배열.
    private final List<String> images;
    private final String businessStatus;
    private final BigDecimal averageRating;
    private final Integer reviewCount;
    private final boolean favorite;
    private final List<String> categories;
    private final List<String> tags;
    private final List<BusinessHourResponseDto> businessHours;
    private final List<MenuResponseDto> menus;
    // 2026-08-10 추가 — 사업자가 "매장 정보" 탭에서 저장한 편의시설을 고객 화면에도 보여준다.
    private final List<String> amenities;

    public RestaurantDetailResponseDto(String restaurantId, String name, String category, String description,
                                        String roadAddress, String address, BigDecimal latitude, BigDecimal longitude,
                                        String phone, String naverPlaceUrl, String imageUrl, List<String> images,
                                        String businessStatus,
                                        BigDecimal averageRating, Integer reviewCount, boolean favorite,
                                        List<String> categories, List<String> tags,
                                        List<BusinessHourResponseDto> businessHours, List<MenuResponseDto> menus,
                                        List<String> amenities) {
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
        this.images = images;
        this.businessStatus = businessStatus;
        this.averageRating = averageRating;
        this.reviewCount = reviewCount;
        this.favorite = favorite;
        this.categories = categories;
        this.tags = tags;
        this.businessHours = businessHours;
        this.menus = menus;
        this.amenities = amenities;
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

    public List<String> getImages() {
        return images;
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

    public List<String> getAmenities() {
        return amenities;
    }
}
