package com.foodtrip.foodsearch.report.dto;

public class ReportActionResponseDto {

    private final boolean success;
    private final String message;

    public ReportActionResponseDto(boolean success, String message) {
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
