package com.foodtrip.foodsearch.member.dto;

public class VerifyPasswordResponseDto {

    private final boolean success;
    private final String message;

    public VerifyPasswordResponseDto(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }
}
