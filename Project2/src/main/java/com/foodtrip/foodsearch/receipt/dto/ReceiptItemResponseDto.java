package com.foodtrip.foodsearch.receipt.dto;

public class ReceiptItemResponseDto {

    private final String name;
    private final Integer price;

    public ReceiptItemResponseDto(String name, Integer price) {
        this.name = name;
        this.price = price;
    }

    public String getName() {
        return name;
    }

    public Integer getPrice() {
        return price;
    }
}
