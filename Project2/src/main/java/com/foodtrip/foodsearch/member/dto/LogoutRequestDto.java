package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;

public class LogoutRequestDto {

    @NotBlank(message = "accessToken은 필수입니다.")
    private String accessToken;

    protected LogoutRequestDto() {
    }

    public LogoutRequestDto(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getAccessToken() {
        return accessToken;
    }
}
