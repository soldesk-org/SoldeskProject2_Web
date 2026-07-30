package com.foodtrip.foodsearch.recommendation.dto;

public record NearbyCoursePlaceDto(
        String placeId,
        String placeName,
        String categoryName,
        String addressName,
        String roadAddressName,
        String placeUrl,
        String x,
        String y,
        Integer distanceMeters) {
}
