package com.foodtrip.foodsearch.recommendation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// AI 추천 요청(2026-07-22 추가) — 팀원이 만든 recommendation_api.py(keyword-extraction)의
// POST /api/recommend를 그대로 프록시한다. x/y는 지도 중심 좌표(경도/위도), radius는 미터 단위(선택).
public class RecommendRequestDto {

    @NotBlank(message = "text는 필수입니다.")
    @Size(max = 500, message = "text는 최대 500자입니다.")
    private String text;

    private Double x;
    private Double y;
    private Integer radius;
    private Integer size;

    protected RecommendRequestDto() {
    }

    public String getText() {
        return text;
    }

    public Double getX() {
        return x;
    }

    public Double getY() {
        return y;
    }

    public Integer getRadius() {
        return radius;
    }

    public Integer getSize() {
        return size;
    }
}
