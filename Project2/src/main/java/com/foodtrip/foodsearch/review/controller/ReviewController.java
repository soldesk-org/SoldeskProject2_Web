package com.foodtrip.foodsearch.review.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.review.dto.CreateReviewRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewResponseDto;
import com.foodtrip.foodsearch.review.dto.UpdateReviewRequestDto;
import com.foodtrip.foodsearch.review.service.ReviewService;

import jakarta.validation.Valid;

// 리뷰 작성/조회/수정/삭제(2026-07-22 수정·삭제 추가 — 지도 테스트 페이지 연동용으로 시작했던 최소 기능이,
// 정식 "3. 사용자 기능" 요청으로 CRUD 전체를 갖춤). 수정/삭제는 로그인 필수 + 본인 리뷰만 가능
// (ReviewServiceImpl 참고).
@RestController
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/api/reviews")
    public ReviewResponseDto create(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                     @Valid @RequestBody CreateReviewRequestDto request) {
        return reviewService.create(authorizationHeader, request);
    }

    @GetMapping("/api/restaurants/{restaurantId}/reviews")
    public List<ReviewResponseDto> listByRestaurant(@PathVariable String restaurantId) {
        return reviewService.listByRestaurant(restaurantId);
    }

    @PatchMapping("/api/reviews/{reviewId}")
    public ReviewResponseDto update(@PathVariable Long reviewId,
                                     @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                     @Valid @RequestBody UpdateReviewRequestDto request) {
        return reviewService.update(reviewId, authorizationHeader, request);
    }

    @DeleteMapping("/api/reviews/{reviewId}")
    public ResponseEntity<Void> delete(@PathVariable Long reviewId,
                                        @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        reviewService.delete(reviewId, authorizationHeader);
        return ResponseEntity.noContent().build();
    }
}
