package com.foodtrip.foodsearch.member.dto;

public class LogoutResponseDto {

    private final boolean success;
    private final String message;

    public LogoutResponseDto(boolean success, String message) {
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
