package com.foodtrip.foodsearch.member.dto;

import com.foodtrip.foodsearch.common.validation.NoProfanity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 회원정보수정 최종 저장 요청. nickname만 필수이고 나머지는 값을 바꿀 때만 채워서 보낸다
 * (001-02(회원정보수정) 5-6장). email/phone/password 관련 필드는 null이면 Bean Validation의
 * @Email/@Pattern이 통과하므로(스펙상 null은 유효) 별도 처리 없이 "생략"으로 다룰 수 있다.
 */
public class UpdateProfileRequestDto {

    @NotBlank(message = "닉네임은 필수입니다.")
    @Pattern(regexp = "^[가-힣a-zA-Z0-9]{2,10}$", message = "닉네임은 2~10자, 특수문자를 포함할 수 없습니다.")
    @NoProfanity
    private String nickname;

    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 100, message = "이메일은 최대 100자입니다.")
    private String email;

    @Pattern(regexp = "^010-\\d{4}-\\d{4}$", message = "전화번호는 010-XXXX-XXXX 형식이어야 합니다.")
    private String phone;

    @Pattern(
            regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,20}$",
            message = "비밀번호는 8~20자, 영문/숫자/특수문자를 모두 포함해야 합니다."
    )
    private String password;

    private String passwordConfirm;

    protected UpdateProfileRequestDto() {
    }

    public UpdateProfileRequestDto(String nickname, String email, String phone, String password, String passwordConfirm) {
        this.nickname = nickname;
        this.email = email;
        this.phone = phone;
        this.password = password;
        this.passwordConfirm = passwordConfirm;
    }

    public String getNickname() {
        return nickname;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getPassword() {
        return password;
    }

    public String getPasswordConfirm() {
        return passwordConfirm;
    }
}
