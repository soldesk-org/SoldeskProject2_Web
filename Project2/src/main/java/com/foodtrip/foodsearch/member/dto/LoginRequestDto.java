package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LoginRequestDto {

    @NotBlank(message = "이메일은 필수입니다.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 100, message = "이메일은 최대 100자입니다.")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다.")
    @Size(max = 100, message = "비밀번호는 최대 100자입니다.")
    private String password;

    // 로그인 상태 유지 체크박스(2026-07-19 요구사항 추가). 선택값 — 생략/false면 짧은 세션(기본 24시간),
    // true면 기존과 동일하게 긴 세션(기본 14일)으로 refreshToken이 발급된다(001-02(로그인) 참고).
    private Boolean rememberMe;

    // 로그인 화면의 "일반 회원"/"사업자 회원" 탭 구분(2026-08-10 추가) — "normal"/"business". 생략하면
    // 검증을 건너뛴다(구버전 클라이언트 호환, MemberServiceImpl.matchesMemberType()과 동일한 관례).
    private String memberType;

    protected LoginRequestDto() {
    }

    public LoginRequestDto(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public LoginRequestDto(String email, String password, Boolean rememberMe) {
        this.email = email;
        this.password = password;
        this.rememberMe = rememberMe;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public Boolean getRememberMe() {
        return rememberMe;
    }

    public String getMemberType() {
        return memberType;
    }

    public void setMemberType(String memberType) {
        this.memberType = memberType;
    }
}
