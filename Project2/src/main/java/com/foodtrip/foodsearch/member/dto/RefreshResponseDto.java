package com.foodtrip.foodsearch.member.dto;

public class RefreshResponseDto {

    private final boolean success;
    private final String message;
    private final String accessToken;
    private final String refreshToken;

    public RefreshResponseDto(boolean success, String message, String accessToken, String refreshToken) {
        this.success = success;
        this.message = message;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }
}
