package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;

public class RevealEmailRequestDto {

    @NotBlank(message = "조회 토큰은 필수입니다.")
    private String verificationToken;

    protected RevealEmailRequestDto() {
    }

    public RevealEmailRequestDto(String verificationToken) {
        this.verificationToken = verificationToken;
    }

    public String getVerificationToken() {
        return verificationToken;
    }
}
