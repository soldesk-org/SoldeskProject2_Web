package com.foodtrip.foodsearch.mail.dto;

public class MailResponseDto {

    private final boolean success;
    private final String message;

    public MailResponseDto(boolean success, String message) {
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
