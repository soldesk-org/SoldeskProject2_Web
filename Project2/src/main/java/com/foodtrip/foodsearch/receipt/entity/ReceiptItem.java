package com.foodtrip.foodsearch.receipt.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// receipt_items(DB-테이블설계.md 4-2장) — OCR이 인식한 영수증 안의 개별 메뉴 항목. Python 서버가
// menu_items 배열을 이미 공짜로 주기 때문에(001-01 참고) 별도 파싱 없이 그대로 저장한다.
@Entity
@Table(name = "receipt_items")
public class ReceiptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "receipt_item_id")
    private Long receiptItemId;

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "item_name", nullable = false, length = 200)
    private String itemName;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "unit_price")
    private Integer unitPrice;

    @Column(name = "total_price")
    private Integer totalPrice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ReceiptItem() {
    }

    // Python 서버 응답은 항목별 수량을 따로 안 줘서(이름+가격만) quantity는 항상 1로 저장한다.
    public static ReceiptItem create(Long receiptId, String itemName, Integer price) {
        ReceiptItem item = new ReceiptItem();
        item.receiptId = receiptId;
        item.itemName = itemName;
        item.quantity = 1;
        item.unitPrice = price;
        item.totalPrice = price;
        return item;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getReceiptItemId() {
        return receiptItemId;
    }

    public Long getReceiptId() {
        return receiptId;
    }

    public String getItemName() {
        return itemName;
    }

    public int getQuantity() {
        return quantity;
    }

    public Integer getUnitPrice() {
        return unitPrice;
    }

    public Integer getTotalPrice() {
        return totalPrice;
    }
}
