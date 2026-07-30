package com.foodtrip.foodsearch.restaurant.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// 사업자 등록: 메뉴 수정(2026-07-20 추가). 판매중지(isAvailable=false)도 이 API로 처리 — 완전 삭제는 별도 DELETE.
public class UpdateMenuRequestDto {

    @NotBlank
    @Size(max = 200)
    private String menuName;

    @NotNull
    @Min(0)
    private Integer price;

    @Size(max = 500)
    private String description;

    private boolean isSignature;

    @NotNull
    private Boolean isAvailable;

    public String getMenuName() {
        return menuName;
    }

    public void setMenuName(String menuName) {
        this.menuName = menuName;
    }

    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isSignature() {
        return isSignature;
    }

    public void setIsSignature(boolean isSignature) {
        this.isSignature = isSignature;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }

    public void setIsAvailable(Boolean isAvailable) {
        this.isAvailable = isAvailable;
    }
}
