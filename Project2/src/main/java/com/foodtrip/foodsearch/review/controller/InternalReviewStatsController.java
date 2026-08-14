package com.foodtrip.foodsearch.review.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioResponseDto;
import com.foodtrip.foodsearch.review.service.ReviewKeywordStatsService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/internal/reviews")
public class InternalReviewStatsController {

    private final ReviewKeywordStatsService reviewKeywordStatsService;
    private final String internalToken;

    public InternalReviewStatsController(ReviewKeywordStatsService reviewKeywordStatsService,
                                         @Value("${recommendation.internal-token:}") String internalToken) {
        this.reviewKeywordStatsService = reviewKeywordStatsService;
        this.internalToken = internalToken;
    }

    @PostMapping("/keyword-ratios")
    public ReviewKeywordRatioResponseDto keywordRatios(
            @RequestHeader(value = "X-Internal-Token", required = false) String suppliedToken,
            @Valid @RequestBody ReviewKeywordRatioRequestDto request) {
        verifyInternalToken(suppliedToken);
        return reviewKeywordStatsService.calculateRatios(request);
    }

    private void verifyInternalToken(String suppliedToken) {
        if (internalToken.isBlank()) {
            return;
        }
        if (suppliedToken == null || !MessageDigest.isEqual(
                internalToken.getBytes(StandardCharsets.UTF_8),
                suppliedToken.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal token");
        }
    }
}
