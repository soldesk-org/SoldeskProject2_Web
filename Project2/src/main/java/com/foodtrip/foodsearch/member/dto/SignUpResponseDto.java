package com.foodtrip.foodsearch.member.dto;

public class SignUpResponseDto {

    private final boolean success;
    private final String message;
    private final Long memberId;

    public SignUpResponseDto(boolean success, String message, Long memberId) {
        this.success = success;
        this.message = message;
        this.memberId = memberId;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public Long getMemberId() {
        return memberId;
    }
}
