package com.foodtrip.foodsearch.phone.dto;

public class PhoneResponseDto {

    private final boolean success;
    private final String message;

    public PhoneResponseDto(boolean success, String message) {
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
