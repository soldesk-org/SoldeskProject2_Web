package com.foodtrip.foodsearch.member.dto;

// 닉네임 중복확인(회원가입 STEP2, 2026-08-04 신규) — 형식/금칙어 검사는 최종 가입 제출 시
// @Valid(SignUpRequestDto)가 다시 하므로, 여기서는 사용 가능 여부(중복 여부)만 알려준다.
public class NicknameAvailabilityResponseDto {

    private final boolean success = true;
    private final boolean available;

    public NicknameAvailabilityResponseDto(boolean available) {
        this.available = available;
    }

    public boolean isSuccess() {
        return success;
    }

    public boolean isAvailable() {
        return available;
    }
}
