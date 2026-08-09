package com.foodtrip.foodsearch.member.dto;

public class LoginResponseDto {

    private final boolean success;
    private final String message;
    private final Long memberId;
    private final String accessToken;
    private final String refreshToken;
    // 2026-08-09 추가 — 소셜로그인 콜백(AuthController)이 프론트로 리다이렉트할 때 클라이언트가
    // localStorage(유지)/sessionStorage(비유지) 중 어디에 토큰을 저장해야 하는지 함께 실어 보내기 위함.
    private final boolean rememberMe;

    public LoginResponseDto(boolean success, String message, Long memberId, String accessToken, String refreshToken,
                             boolean rememberMe) {
        this.success = success;
        this.message = message;
        this.memberId = memberId;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.rememberMe = rememberMe;
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

    public boolean isRememberMe() {
        return rememberMe;
    }
}
