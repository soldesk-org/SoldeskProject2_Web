package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PasswordResetRequestDto {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 100, message = "이메일은 최대 100자입니다.")
    private String email;

    // 다른 탭(find-password-sent.html)에서 폴링으로 인증 완료를 감지할 때 쓰는 상관관계 키
    // (2026-08-04 추가). 클라이언트가 요청 전 랜덤 생성해서 sessionStorage에 저장해두고 같이 보낸다.
    // 선택값 — 없어도 재설정 요청 자체는 그대로 동작한다.
    @Size(max = 100, message = "pollKey는 최대 100자입니다.")
    private String pollKey;

    protected PasswordResetRequestDto() {
    }

    public PasswordResetRequestDto(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public String getPollKey() {
        return pollKey;
    }
}
