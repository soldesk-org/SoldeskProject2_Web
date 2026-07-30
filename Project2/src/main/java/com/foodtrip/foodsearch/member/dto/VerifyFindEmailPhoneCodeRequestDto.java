package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class VerifyFindEmailPhoneCodeRequestDto {

    @NotBlank(message = "조회 토큰은 필수입니다.")
    private String verificationToken;

    @NotBlank(message = "전화번호는 필수입니다.")
    @Pattern(regexp = "^010-\\d{4}-\\d{4}$", message = "전화번호는 010-XXXX-XXXX 형식이어야 합니다.")
    private String phone;

    @NotBlank(message = "인증번호는 필수입니다.")
    private String code;

    protected VerifyFindEmailPhoneCodeRequestDto() {
    }

    public VerifyFindEmailPhoneCodeRequestDto(String verificationToken, String phone, String code) {
        this.verificationToken = verificationToken;
        this.phone = phone;
        this.code = code;
    }

    public String getVerificationToken() {
        return verificationToken;
    }

    public String getPhone() {
        return phone;
    }

    public String getCode() {
        return code;
    }
}
