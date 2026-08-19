package com.foodtrip.foodsearch.receipt.dto;

import java.util.List;

// 영수증 업로드+OCR+방문 인증 결과(001-02 6-1장). 리뷰 작성 화면이 이 값으로 폼을 미리 채우고
// 인증 뱃지(verified)를 표시하는 데 쓴다(리뷰 작성 기능 자체는 이번 범위 아님).
public class ReceiptUploadResponseDto {

    private final boolean success = true;
    private final Long receiptId;
    private final String storeName;
    private final String orderDatetime;
    private final Integer totalPrice;
    private final List<ReceiptItemResponseDto> menuItems;
    private final boolean verified;
    private final String restaurantId;
    private final List<OcrLineResponseDto> ocrLines;

    public ReceiptUploadResponseDto(Long receiptId, String storeName, String orderDatetime, Integer totalPrice,
                                     List<ReceiptItemResponseDto> menuItems, boolean verified, String restaurantId,
                                     List<OcrLineResponseDto> ocrLines) {
        this.receiptId = receiptId;
        this.storeName = storeName;
        this.orderDatetime = orderDatetime;
        this.totalPrice = totalPrice;
        this.menuItems = menuItems;
        this.verified = verified;
        this.restaurantId = restaurantId;
        this.ocrLines = ocrLines;
    }

    public boolean isSuccess() {
        return success;
    }

    public Long getReceiptId() {
        return receiptId;
    }

    public String getStoreName() {
        return storeName;
    }

    public String getOrderDatetime() {
        return orderDatetime;
    }

    public Integer getTotalPrice() {
        return totalPrice;
    }

    public List<ReceiptItemResponseDto> getMenuItems() {
        return menuItems;
    }

    public boolean isVerified() {
        return verified;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public List<OcrLineResponseDto> getOcrLines() {
        return ocrLines;
    }
}
