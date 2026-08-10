package com.foodtrip.foodsearch.review.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.review.dto.CreateReviewRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewImageResponseDto;
import com.foodtrip.foodsearch.review.dto.ReviewResponseDto;
import com.foodtrip.foodsearch.review.dto.UpdateReviewRequestDto;

public interface ReviewService {

    ReviewResponseDto create(String authorizationHeader, CreateReviewRequestDto request);

    List<ReviewResponseDto> listByRestaurant(String restaurantId);

    ReviewResponseDto update(Long reviewId, String authorizationHeader, UpdateReviewRequestDto request);

    void delete(Long reviewId, String authorizationHeader);

    // 리뷰 사진 첨부(2026-08-10 추가) — 리뷰 작성 직후 별도 호출(receipt-upload.js가 리뷰 생성 성공 후
    // 이어서 호출), 최대 3장까지(기존 첨부 수 포함).
    List<ReviewImageResponseDto> addImages(Long reviewId, String authorizationHeader, List<MultipartFile> images);
}
