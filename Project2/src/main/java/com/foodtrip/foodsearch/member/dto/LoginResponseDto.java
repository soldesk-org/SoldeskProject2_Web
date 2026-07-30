package com.foodtrip.foodsearch.member.dto;

public class LoginResponseDto {

    private final boolean success;
    private final String message;
    private final Long memberId;
    private final String accessToken;
    private final String refreshToken;

    public LoginResponseDto(boolean success, String message, Long memberId, String accessToken, String refreshToken) {
        this.success = success;
        this.message = message;
        this.memberId = memberId;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }
}
