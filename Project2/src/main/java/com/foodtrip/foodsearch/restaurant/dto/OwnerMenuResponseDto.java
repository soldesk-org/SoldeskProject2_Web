package com.foodtrip.foodsearch.restaurant.dto;

// 사업자 마이페이지 "메뉴 관리" 탭(2026-08-06 추가) 전용 — 공개 MenuResponseDto와 달리
// isAvailable(판매중 여부)도 노출해서, 본인이 등록한 메뉴는 판매중지 상태여도 목록에서 계속 보인다.
public class OwnerMenuResponseDto {

    private final Long menuId;
    private final String menuName;
    private final Integer price;
    private final String description;
    private final String imageUrl;
    private final boolean isSignature;
    private final boolean isAvailable;

    public OwnerMenuResponseDto(Long menuId, String menuName, Integer price, String description, String imageUrl,
                                 boolean isSignature, boolean isAvailable) {
        this.menuId = menuId;
        this.menuName = menuName;
        this.price = price;
        this.description = description;
        this.imageUrl = imageUrl;
        this.isSignature = isSignature;
        this.isAvailable = isAvailable;
    }

    public Long getMenuId() {
        return menuId;
    }

    public String getMenuName() {
        return menuName;
    }

    public Integer getPrice() {
        return price;
    }

    public String getDescription() {
        return description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isSignature() {
        return isSignature;
    }

    public boolean isAvailable() {
        return isAvailable;
    }
}
