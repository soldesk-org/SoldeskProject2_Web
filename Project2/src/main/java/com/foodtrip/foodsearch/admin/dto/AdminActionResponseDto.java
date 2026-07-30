package com.foodtrip.foodsearch.admin.dto;

public class AdminActionResponseDto {

    private final boolean success;
    private final String message;

    public AdminActionResponseDto(boolean success, String message) {
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
