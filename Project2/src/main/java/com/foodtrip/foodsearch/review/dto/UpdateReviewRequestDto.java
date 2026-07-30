package com.foodtrip.foodsearch.review.dto;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// 리뷰 수정(2026-07-22 추가) — 작성 때와 같은 필드를 통째로 교체(부분 수정 아님, CreateReviewRequestDto와
// 같은 검증 규칙). keywords도 마찬가지로 통째로 교체(기존 태그를 지우고 새로 넣음, 2026-07-22 태그 기능 추가).
public class UpdateReviewRequestDto {

    @NotNull(message = "평점은 필수입니다.")
    @Min(value = 1, message = "평점은 1~5 사이여야 합니다.")
    @Max(value = 5, message = "평점은 1~5 사이여야 합니다.")
    private Integer rating;

    @Size(max = 1000, message = "리뷰 내용은 최대 1000자입니다.")
    private String content;

    private List<String> keywords;

    protected UpdateReviewRequestDto() {
    }

    public Integer getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public List<String> getKeywords() {
        return keywords;
    }
}
