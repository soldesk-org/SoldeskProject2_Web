package com.foodtrip.foodsearch.restaurant.dto;

import java.util.List;

// 목록(5-1)/검색(5-3)/주변조회(5-5) 공용 래퍼.
public class RestaurantListResponseDto {

    private final boolean success = true;
    private final int page;
    private final int size;
    private final long totalCount;
    private final List<RestaurantSummaryResponseDto> restaurants;

    public RestaurantListResponseDto(int page, int size, long totalCount, List<RestaurantSummaryResponseDto> restaurants) {
        this.page = page;
        this.size = size;
        this.totalCount = totalCount;
        this.restaurants = restaurants;
    }

    public boolean isSuccess() {
        return success;
    }

    public int getPage() {
        return page;
    }

    public int getSize() {
        return size;
    }

    public long getTotalCount() {
        return totalCount;
    }

    public List<RestaurantSummaryResponseDto> getRestaurants() {
        return restaurants;
    }
}
