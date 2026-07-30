package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;

// 마이페이지(11) "프로필 수정 진입 시 비밀번호 재확인" 게이트(2026-07-22 추가) — withdraw()의 재인증
// 패턴(WithdrawRequestDto)과 같은 톤, 다만 이건 아무것도 바꾸지 않고 단순히 맞는지만 확인한다.
public class VerifyPasswordRequestDto {

    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;

    protected VerifyPasswordRequestDto() {
    }

    public VerifyPasswordRequestDto(String password) {
        this.password = password;
    }

    public String getPassword() {
        return password;
    }
}
