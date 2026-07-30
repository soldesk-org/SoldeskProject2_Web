package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class RefreshRequestDto {

    @NotNull(message = "memberId는 필수입니다.")
    private Long memberId;

    @NotBlank(message = "refreshToken은 필수입니다.")
    private String refreshToken;

    protected RefreshRequestDto() {
    }

    public RefreshRequestDto(Long memberId, String refreshToken) {
        this.memberId = memberId;
        this.refreshToken = refreshToken;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getRefreshToken() {
        return refreshToken;
    }
}
