package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class SendProfilePhoneCodeRequestDto {

    @NotBlank(message = "전화번호는 필수입니다.")
    @Pattern(regexp = "^010-\\d{4}-\\d{4}$", message = "전화번호는 010-XXXX-XXXX 형식이어야 합니다.")
    private String phone;

    protected SendProfilePhoneCodeRequestDto() {
    }

    public SendProfilePhoneCodeRequestDto(String phone) {
        this.phone = phone;
    }

    public String getPhone() {
        return phone;
    }
}
