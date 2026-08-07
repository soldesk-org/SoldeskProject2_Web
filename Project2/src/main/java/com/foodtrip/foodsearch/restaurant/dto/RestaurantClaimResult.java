package com.foodtrip.foodsearch.restaurant.dto;

import java.util.List;

// RestaurantClaimServiceImpl.tryAutoClaim()의 결과(2026-08-07). CLAIMED면 candidates는 비어있고,
// AMBIGUOUS면 candidates에 후보 목록이 담긴다(프론트가 그중 하나를 골라 수동 귀속하도록 안내).
public record RestaurantClaimResult(String status, List<RestaurantCandidateDto> candidates) {

    public static final String STATUS_CLAIMED = "CLAIMED";
    public static final String STATUS_AMBIGUOUS = "AMBIGUOUS";
    public static final String STATUS_NOT_FOUND = "NOT_FOUND";
    public static final String STATUS_SKIPPED = "SKIPPED";

    public static RestaurantClaimResult claimed() {
        return new RestaurantClaimResult(STATUS_CLAIMED, List.of());
    }

    public static RestaurantClaimResult ambiguous(List<RestaurantCandidateDto> candidates) {
        return new RestaurantClaimResult(STATUS_AMBIGUOUS, candidates);
    }

    public static RestaurantClaimResult notFound() {
        return new RestaurantClaimResult(STATUS_NOT_FOUND, List.of());
    }

    public static RestaurantClaimResult skipped() {
        return new RestaurantClaimResult(STATUS_SKIPPED, List.of());
    }
}
