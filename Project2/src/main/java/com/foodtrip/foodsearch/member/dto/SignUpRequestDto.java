package com.foodtrip.foodsearch.member.dto;

import com.foodtrip.foodsearch.common.validation.NoProfanity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class SignUpRequestDto {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 100, message = "이메일은 최대 100자입니다.")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Pattern(
            regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,20}$",
            message = "비밀번호는 8~20자, 영문/숫자/특수문자를 모두 포함해야 합니다."
    )
    private String password;

    @NotBlank(message = "비밀번호 확인은 필수입니다.")
    private String passwordConfirm;

    @NotBlank(message = "닉네임은 필수입니다.")
    @Pattern(regexp = "^[가-힣a-zA-Z0-9]{2,10}$", message = "닉네임은 2~10자, 특수문자를 포함할 수 없습니다.")
    @NoProfanity
    private String nickname;

    @NotBlank(message = "전화번호는 필수입니다.")
    @Pattern(regexp = "^010-\\d{4}-\\d{4}$", message = "전화번호는 010-XXXX-XXXX 형식이어야 합니다.")
    private String phone;

    // 알림 설정(2026-08-06 추가) — signup-info.html의 추천/채팅 알림 토글. null이면(구버전 클라이언트 호환)
    // Member 엔티티 기본값(둘 다 true)을 그대로 둔다.
    private Boolean notifyRecommend;

    private Boolean notifyChat;

    protected SignUpRequestDto() {
    }

    public SignUpRequestDto(String email, String password, String passwordConfirm, String nickname, String phone) {
        this.email = email;
        this.password = password;
        this.passwordConfirm = passwordConfirm;
        this.nickname = nickname;
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public String getPasswordConfirm() {
        return passwordConfirm;
    }

    public String getNickname() {
        return nickname;
    }

    public String getPhone() {
        return phone;
    }

    public Boolean getNotifyRecommend() {
        return notifyRecommend;
    }

    public Boolean getNotifyChat() {
        return notifyChat;
    }
}
