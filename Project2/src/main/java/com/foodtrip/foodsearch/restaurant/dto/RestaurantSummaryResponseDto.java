package com.foodtrip.foodsearch.restaurant.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonInclude;

// 목록(5-1)/검색(5-3)/주변조회(5-5) 공용 응답 필드(001-02 5-0장). distanceKm은 주변조회에서만 채워지고
// 나머지 응답에서는 null이라 필드 자체를 생략한다(JsonInclude.NON_NULL).
public class RestaurantSummaryResponseDto {

    private final String restaurantId;
    private final String name;
    private final String category;
    private final String roadAddress;
    private final String address;
    private final BigDecimal latitude;
    private final BigDecimal longitude;
    private final String naverPlaceUrl;
    private final String imageUrl;
    private final BigDecimal averageRating;
    private final Integer reviewCount;
    private final boolean favorite;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Double distanceKm;

    public RestaurantSummaryResponseDto(String restaurantId, String name, String category, String roadAddress,
                                         String address, BigDecimal latitude, BigDecimal longitude,
                                         String naverPlaceUrl, String imageUrl, BigDecimal averageRating, Integer reviewCount,
                                         boolean favorite, Double distanceKm) {
        this.restaurantId = restaurantId;
        this.name = name;
        this.category = category;
        this.roadAddress = roadAddress;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.naverPlaceUrl = naverPlaceUrl;
        this.imageUrl = imageUrl;
        this.averageRating = averageRating;
        this.reviewCount = reviewCount;
        this.favorite = favorite;
        this.distanceKm = distanceKm;
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

    public String getNaverPlaceUrl() {
        return naverPlaceUrl;
    }

    public String getImageUrl() {
        return imageUrl;
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

    public Double getDistanceKm() {
        return distanceKm;
    }
}
