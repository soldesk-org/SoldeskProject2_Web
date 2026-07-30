package com.foodtrip.foodsearch.restaurant.dto;

// 네이버 지역 검색 API 동기화 트리거 결과(001-02 4-3장/9장). 관리자/내부용 — 프론트 인수인계 대상 아님.
public class RestaurantSyncResponseDto {

    private final boolean success = true;
    private final String query;
    private final int fetchedCount;
    private final int createdCount;
    private final int updatedCount;

    public RestaurantSyncResponseDto(String query, int fetchedCount, int createdCount, int updatedCount) {
        this.query = query;
        this.fetchedCount = fetchedCount;
        this.createdCount = createdCount;
        this.updatedCount = updatedCount;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getQuery() {
        return query;
    }

    public int getFetchedCount() {
        return fetchedCount;
    }

    public int getCreatedCount() {
        return createdCount;
    }

    public int getUpdatedCount() {
        return updatedCount;
    }
}
