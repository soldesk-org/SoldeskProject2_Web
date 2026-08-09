package com.foodtrip.foodsearch.shortlink.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateShortLinkRequestDto {

    @NotBlank
    private String path;

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }
}
