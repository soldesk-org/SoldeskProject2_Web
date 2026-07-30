package com.foodtrip.foodsearch.recommendation.dto;

import java.util.List;

public class NearbyCourseResponseDto {

    private final String type;
    private final String message;
    private final List<NearbyCoursePlaceDto> places;

    public NearbyCourseResponseDto(String type, String message, List<NearbyCoursePlaceDto> places) {
        this.type = type;
        this.message = message;
        this.places = places;
    }

    public String getType() {
        return type;
    }

    public String getMessage() {
        return message;
    }

    public List<NearbyCoursePlaceDto> getPlaces() {
        return places;
    }
}
