package com.foodtrip.foodsearch.review.service;

import java.util.List;

import com.foodtrip.foodsearch.review.dto.CreateReviewRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewResponseDto;
import com.foodtrip.foodsearch.review.dto.UpdateReviewRequestDto;

public interface ReviewService {

    ReviewResponseDto create(String authorizationHeader, CreateReviewRequestDto request);

    List<ReviewResponseDto> listByRestaurant(String restaurantId);

    ReviewResponseDto update(Long reviewId, String authorizationHeader, UpdateReviewRequestDto request);

    void delete(Long reviewId, String authorizationHeader);
}
