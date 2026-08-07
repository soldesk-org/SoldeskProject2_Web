package com.foodtrip.foodsearch.member.dto;

// 비밀번호 재설정 — 다른 탭(이메일 링크)에서 인증이 확인됐는지 폴링으로 확인한다(2026-08-04 신규).
// confirmed=true일 때만 token을 함께 내려준다(미확인 상태에서는 토큰을 노출하지 않는다).
public class PasswordResetPollResponseDto {

    private final boolean success = true;
    private final boolean confirmed;
    private final String token;

    public PasswordResetPollResponseDto(boolean confirmed, String token) {
        this.confirmed = confirmed;
        this.token = token;
    }

    public boolean isSuccess() {
        return success;
    }

    public boolean isConfirmed() {
        return confirmed;
    }

    public String getToken() {
        return token;
    }
}
