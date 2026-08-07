package com.foodtrip.foodsearch.business.service;

import com.foodtrip.foodsearch.business.dto.BusinessReviewsResponseDto;
import com.foodtrip.foodsearch.business.dto.BusinessShopResponseDto;
import com.foodtrip.foodsearch.business.dto.BusinessStatsResponseDto;
import com.foodtrip.foodsearch.business.dto.ClaimRestaurantRequestDto;

public interface BusinessDashboardService {

    BusinessShopResponseDto getShop(String authorizationHeader);

    BusinessStatsResponseDto getStats(String authorizationHeader);

    BusinessReviewsResponseDto getReviews(String authorizationHeader, int page, int size);

    // 매장 자동귀속이 모호했을 때(AMBIGUOUS) 사업자가 후보 중 하나를 직접 골라 수동으로 귀속(2026-08-07 신규).
    BusinessShopResponseDto claimRestaurant(String authorizationHeader, ClaimRestaurantRequestDto request);
}
