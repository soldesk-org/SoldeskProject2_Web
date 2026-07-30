package com.foodtrip.foodsearch.chat.dto;

public class ChatActionResponseDto {

    private final boolean success;
    private final String message;

    public ChatActionResponseDto(boolean success, String message) {
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
