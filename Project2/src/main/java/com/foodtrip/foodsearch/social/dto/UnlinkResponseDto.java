package com.foodtrip.foodsearch.social.dto;

public class UnlinkResponseDto {

    private final boolean success;
    private final String message;

    public UnlinkResponseDto(boolean success, String message) {
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
