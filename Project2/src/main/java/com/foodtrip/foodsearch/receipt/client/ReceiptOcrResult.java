package com.foodtrip.foodsearch.receipt.client;

import java.util.List;

// receipt-biz-verify Python 서버의 POST /parse-receipt 성공 응답(001-01/001-02 참고).
public record ReceiptOcrResult(
        String storeName,
        String orderDatetime,
        List<MenuItemResult> menuItems,
        Integer totalPrice,
        String transactionId) {

    public record MenuItemResult(String name, Integer price) {
    }
}
