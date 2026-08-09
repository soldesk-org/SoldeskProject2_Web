package com.foodtrip.foodsearch.shortlink.dto;

public class ShortLinkResponseDto {

    private final String code;
    private final String path;

    public ShortLinkResponseDto(String code, String path) {
        this.code = code;
        this.path = path;
    }

    public String getCode() {
        return code;
    }

    public String getPath() {
        return path;
    }
}
