package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 회원탈퇴 요청. accessToken(Authorization 헤더) 탈취만으로 탈퇴되지 않도록
 * 현재 비밀번호 재확인을 요구한다(001-02(회원정보수정) 2-5장).
 */
public class WithdrawRequestDto {

    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;

    // 탈퇴 사유(2026-08-06 추가) — mypage.html #withdrawReasonSelect의 코드값(NOT_USEFUL/FEW_SHOPS/
    // HARD_TO_USE/PRIVACY/ETC). "선택하지 않음"이면 빈 문자열/null로 온다 — 선택 사항이라 검증 없음.
    private String reason;

    protected WithdrawRequestDto() {
    }

    public WithdrawRequestDto(String password) {
        this.password = password;
    }

    public String getPassword() {
        return password;
    }

    public String getReason() {
        return reason;
    }
}
