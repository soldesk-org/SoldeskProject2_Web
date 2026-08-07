package com.foodtrip.foodsearch.member.dto;

// 비밀번호 재설정 이메일 링크가 열렸을 때(find-password-reset.html 로드) 호출한 결과(2026-08-04 신규).
// firstTime=false면 같은 링크를 이미 한 번 열었던 것 — 프론트가 "이미 사용된 링크"로 안내한다.
public class PasswordResetLinkOpenedResponseDto {

    private final boolean success = true;
    private final boolean firstTime;

    public PasswordResetLinkOpenedResponseDto(boolean firstTime) {
        this.firstTime = firstTime;
    }

    public boolean isSuccess() {
        return success;
    }

    public boolean isFirstTime() {
        return firstTime;
    }
}
