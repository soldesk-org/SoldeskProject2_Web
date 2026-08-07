package com.foodtrip.foodsearch.member.dto;

import com.foodtrip.foodsearch.common.validation.NoProfanity;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * multipart/form-data 요청(@ModelAttribute)으로 바인딩되는 사업자 회원가입 폼 필드.
 * JSON @RequestBody DTO(SignUpRequestDto)와 달리 세터 기반의 가변 빈으로 작성한다
 * (Spring MVC의 멀티파트 폼 바인딩은 세터 방식이 가장 안전하고 널리 쓰이는 방식).
 */
public class BusinessSignUpRequestDto {

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

    // 매장 자동귀속용 가게명(2026-08-07 필수 입력 추가) — 프론트의 "매장 검색" 팝업(카카오 실시간
    // 키워드 검색)에서 고른 정확한 상호명이 들어온다. 사업장 주소만으로는 같은 주소에 여러 상호가 있는
    // 경우(예: 1층 A카페/2층 B카페) 구분이 안 되는 문제를 해결하기 위함(RestaurantClaimServiceImpl 참고).
    @NotBlank(message = "가게명은 필수입니다.")
    @Size(max = 100, message = "가게명은 최대 100자입니다.")
    private String storeName;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPasswordConfirm() {
        return passwordConfirm;
    }

    public void setPasswordConfirm(String passwordConfirm) {
        this.passwordConfirm = passwordConfirm;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }
}
