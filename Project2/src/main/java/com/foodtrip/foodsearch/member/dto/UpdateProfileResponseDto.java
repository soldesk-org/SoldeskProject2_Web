package com.foodtrip.foodsearch.member.dto;

public class UpdateProfileResponseDto {

    private final boolean success;
    private final String message;

    public UpdateProfileResponseDto(boolean success, String message) {
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
