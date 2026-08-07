package com.foodtrip.foodsearch.member.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantCandidateDto;

public class SignUpResponseDto {

    private final boolean success;
    private final String message;
    private final Long memberId;

    // 사업자 회원가입에서만 채워진다(2026-08-07 추가) — 일반 회원가입은 항상 null이라 응답에서 생략된다.
    // restaurantClaimStatus: CLAIMED(자동 연결 완료)/NOT_FOUND/AMBIGUOUS/SKIPPED(주소 미인식).
    // AMBIGUOUS일 때만 restaurantCandidates가 채워지며, 프론트는 이 목록을 보여주고
    // POST /api/business/claim-restaurant로 수동 귀속을 안내해야 한다.
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final String restaurantClaimStatus;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final List<RestaurantCandidateDto> restaurantCandidates;

    public SignUpResponseDto(boolean success, String message, Long memberId) {
        this(success, message, memberId, null, null);
    }

    public SignUpResponseDto(boolean success, String message, Long memberId, String restaurantClaimStatus,
                              List<RestaurantCandidateDto> restaurantCandidates) {
        this.success = success;
        this.message = message;
        this.memberId = memberId;
        this.restaurantClaimStatus = restaurantClaimStatus;
        this.restaurantCandidates = restaurantCandidates;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getRestaurantClaimStatus() {
        return restaurantClaimStatus;
    }

    public List<RestaurantCandidateDto> getRestaurantCandidates() {
        return restaurantCandidates;
    }
}
