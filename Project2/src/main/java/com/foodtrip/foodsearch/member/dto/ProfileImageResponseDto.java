package com.foodtrip.foodsearch.member.dto;

public class ProfileImageResponseDto {

    private final boolean success;
    private final String message;
    private final String profileImageUrl;

    public ProfileImageResponseDto(boolean success, String message, String profileImageUrl) {
        this.success = success;
        this.message = message;
        this.profileImageUrl = profileImageUrl;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }
}
