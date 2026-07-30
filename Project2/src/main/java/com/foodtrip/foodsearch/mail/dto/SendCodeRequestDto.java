package com.foodtrip.foodsearch.mail.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SendCodeRequestDto {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 100, message = "이메일은 최대 100자입니다.")
    private String email;

    protected SendCodeRequestDto() {
    }

    public SendCodeRequestDto(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
