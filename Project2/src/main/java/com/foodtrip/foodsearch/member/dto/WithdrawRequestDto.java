package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 회원탈퇴 요청. accessToken(Authorization 헤더) 탈취만으로 탈퇴되지 않도록
 * 현재 비밀번호 재확인을 요구한다(001-02(회원정보수정) 2-5장).
 */
public class WithdrawRequestDto {

    @NotBlank(message = "비밀번호는 필수입니다.")
    private String password;

    protected WithdrawRequestDto() {
    }

    public WithdrawRequestDto(String password) {
        this.password = password;
    }

    public String getPassword() {
        return password;
    }
}
