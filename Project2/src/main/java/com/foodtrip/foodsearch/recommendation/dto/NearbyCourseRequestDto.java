package com.foodtrip.foodsearch.recommendation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class NearbyCourseRequestDto {

    @NotNull(message = "type은 필수입니다.")
    @Pattern(regexp = "PARK|CAFE", message = "type은 PARK 또는 CAFE여야 합니다.")
    private String type;

    // 방금 추천받은 음식점 이름(선택) - AI 안내 문구를 자연스럽게 만들 때만 쓰고, 없어도 동작한다.
    private String anchorName;

    @NotNull(message = "x는 필수입니다.")
    private Double x;

    @NotNull(message = "y는 필수입니다.")
    private Double y;

    protected NearbyCourseRequestDto() {
    }

    public String getType() {
        return type;
    }

    public String getAnchorName() {
        return anchorName;
    }

    public Double getX() {
        return x;
    }

    public Double getY() {
        return y;
    }
}
