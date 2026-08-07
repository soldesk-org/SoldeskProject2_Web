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

    // 화면의 "계정 유형"(일반/사업자) 라디오 값 — "normal" 또는 "business"(2026-08-04 추가). 예전엔
    // 화면에만 있고 실제로 전송/검증되지 않아, 사업자 계정이 아닌 회원도 "사업자 회원" 선택 후 그대로
    // 인증 절차를 통과하는 문제가 있었다. 생략되면(구버전 클라이언트 호환) 검증을 건너뛴다.
    private String memberType;

    protected FindEmailRequestDto() {
    }

    public FindEmailRequestDto(String nickname, String phone, String memberType) {
        this.nickname = nickname;
        this.phone = phone;
        this.memberType = memberType;
    }

    public String getNickname() {
        return nickname;
    }

    public String getPhone() {
        return phone;
    }

    public String getMemberType() {
        return memberType;
    }
}
