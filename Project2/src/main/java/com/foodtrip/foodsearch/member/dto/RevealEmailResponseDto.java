package com.foodtrip.foodsearch.member.dto;

public class RevealEmailResponseDto {

    private final boolean success;
    private final String message;
    private final String email;

    public RevealEmailResponseDto(boolean success, String message, String email) {
        this.success = success;
        this.message = message;
        this.email = email;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public String getEmail() {
        return email;
    }
}
