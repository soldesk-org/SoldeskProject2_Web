package com.foodtrip.foodsearch.business.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.business.dto.BusinessReviewsResponseDto;
import com.foodtrip.foodsearch.business.dto.BusinessShopResponseDto;
import com.foodtrip.foodsearch.business.dto.BusinessStatsResponseDto;
import com.foodtrip.foodsearch.business.dto.ClaimRestaurantRequestDto;
import com.foodtrip.foodsearch.business.service.BusinessDashboardService;

import jakarta.validation.Valid;

// 사업자 마이페이지 "내 매장 관리"(2026-08-06 추가) — 리뷰 통계/반응 요약만 실데이터로 연동.
// 매장 정보 수정/메뉴/사진 관리는 이번 범위 밖(business-mypage.js 주석 참고).
@RestController
public class BusinessDashboardController {

    private final BusinessDashboardService businessDashboardService;

    public BusinessDashboardController(BusinessDashboardService businessDashboardService) {
        this.businessDashboardService = businessDashboardService;
    }

    @GetMapping("/api/business/me/shop")
    public BusinessShopResponseDto getShop(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return businessDashboardService.getShop(authorizationHeader);
    }

    @GetMapping("/api/business/me/stats")
    public BusinessStatsResponseDto getStats(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return businessDashboardService.getStats(authorizationHeader);
    }

    @GetMapping("/api/business/me/reviews")
    public BusinessReviewsResponseDto getReviews(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        return businessDashboardService.getReviews(authorizationHeader, page, size);
    }

    // 매장 자동귀속이 모호했을 때(회원가입 응답의 AMBIGUOUS 후보 목록) 사업자가 직접 골라 수동 귀속(2026-08-07 신규).
    @PostMapping("/api/business/claim-restaurant")
    public BusinessShopResponseDto claimRestaurant(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody ClaimRestaurantRequestDto request) {
        return businessDashboardService.claimRestaurant(authorizationHeader, request);
    }
}
