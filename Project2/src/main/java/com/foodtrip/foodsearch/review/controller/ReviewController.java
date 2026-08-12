package com.foodtrip.foodsearch.review.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.review.dto.CreateReviewRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewHelpfulResponseDto;
import com.foodtrip.foodsearch.review.dto.ReviewImageResponseDto;
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
    public List<ReviewResponseDto> listByRestaurant(@PathVariable String restaurantId,
                                                      @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return reviewService.listByRestaurant(restaurantId, authorizationHeader);
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

    // 리뷰 사진 첨부(2026-08-10 추가) — 리뷰 작성 성공 직후 프론트가 이어서 호출한다(최대 3장, 기존
    // profile-image/restaurant-image/receipt-image와 같은 별도 업로드 엔드포인트 패턴).
    @PostMapping(value = "/api/reviews/{reviewId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<ReviewImageResponseDto> addImages(@PathVariable Long reviewId,
                                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                    @RequestParam("images") List<MultipartFile> images) {
        return reviewService.addImages(reviewId, authorizationHeader, images);
    }

    @DeleteMapping("/api/reviews/{reviewId}/images/{reviewImageId}")
    public List<ReviewImageResponseDto> deleteImage(@PathVariable Long reviewId,
                                                       @PathVariable Long reviewImageId,
                                                       @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return reviewService.deleteImage(reviewId, reviewImageId, authorizationHeader);
    }

    // 리뷰 "도움됨" 토글(2026-08-12 추가) — 눌렀을 때 등록, 다시 누르면 취소.
    @PostMapping("/api/reviews/{reviewId}/helpful")
    public ReviewHelpfulResponseDto toggleHelpful(@PathVariable Long reviewId,
                                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return reviewService.toggleHelpful(reviewId, authorizationHeader);
    }
}
