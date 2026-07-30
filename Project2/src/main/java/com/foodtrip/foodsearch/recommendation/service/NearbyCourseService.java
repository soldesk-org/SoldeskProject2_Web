package com.foodtrip.foodsearch.recommendation.service;

import com.foodtrip.foodsearch.recommendation.dto.NearbyCourseResponseDto;

public interface NearbyCourseService {

    NearbyCourseResponseDto suggest(String type, String anchorName, Double x, Double y);
}
