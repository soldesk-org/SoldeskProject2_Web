package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class FindEmailRequestDto {

    @NotBlank(message = "닉네임은 필수입니다.")
    @Pattern(regexp = "^[가-힣a-zA-Z0-9]{2,10}$", message = "닉네임은 2~10자, 특수문자를 포함할 수 없습니다.")
    private String nickname;

    @NotBlank(message = "전화번호는 필수입니다.")
    @Pattern(regexp = "^010-\\d{4}-\\d{4}$", message = "전화번호는 010-XXXX-XXXX 형식이어야 합니다.")
    private String phone;

    protected FindEmailRequestDto() {
    }

    public FindEmailRequestDto(String nickname, String phone) {
        this.nickname = nickname;
        this.phone = phone;
    }

    public String getNickname() {
        return nickname;
    }

    public String getPhone() {
        return phone;
    }
}
