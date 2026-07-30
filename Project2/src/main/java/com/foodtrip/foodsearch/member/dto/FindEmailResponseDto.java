package com.foodtrip.foodsearch.member.dto;

public class FindEmailResponseDto {

    private final boolean success;
    private final String message;
    private final String maskedEmail;
    private final String verificationToken;

    public FindEmailResponseDto(boolean success, String message, String maskedEmail, String verificationToken) {
        this.success = success;
        this.message = message;
        this.maskedEmail = maskedEmail;
        this.verificationToken = verificationToken;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public String getMaskedEmail() {
        return maskedEmail;
    }

    public String getVerificationToken() {
        return verificationToken;
    }
}
