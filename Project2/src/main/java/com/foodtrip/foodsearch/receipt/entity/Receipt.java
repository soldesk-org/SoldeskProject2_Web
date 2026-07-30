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

// receipts 테이블은 DB-테이블설계.md 4-1장 기준으로 이미 설계돼 있었다. transaction_id 컬럼만 이번
// 기능(08)에서 새로 추가한 것 — Python OCR 서버가 주는 승인번호/영수증번호/바코드 값으로, 같은 영수증
// 재사용(어뷰징)을 막는 중복 검사 키다(001-02 3장).
@Entity
@Table(name = "receipts")
public class Receipt {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "receipt_id")
    private Long receiptId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    // 매칭 성공(방문 인증 성공) 전까지는 NULL — claim()으로 채운다(001-02 5장 7단계).
    @Column(name = "restaurant_id")
    private String restaurantId;

    @Column(name = "image_path", nullable = false, length = 500)
    private String imagePath;

    @Column(name = "ocr_status", nullable = false, length = 20)
    private String ocrStatus;

    @Column(name = "ocr_raw_text", columnDefinition = "TEXT")
    private String ocrRawText;

    @Column(name = "parsed_store_name", length = 200)
    private String parsedStoreName;

    @Column(name = "parsed_payment_date")
    private LocalDateTime parsedPaymentDate;

    @Column(name = "parsed_total_amount")
    private Integer parsedTotalAmount;

    // 2026-07-21 신규 추가(001-02 3장) — 중복 리뷰 등록 방지용 고유값. 값이 있으면 유일해야 하지만
    // NULL은 여러 개 허용(MySQL UNIQUE 제약의 표준 동작, OCR이 못 찾은 경우까지 막을 이유는 없음).
    @Column(name = "transaction_id", unique = true, length = 50)
    private String transactionId;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected Receipt() {
    }

    public static Receipt createPending(Long memberId, String imagePath) {
        Receipt receipt = new Receipt();
        receipt.memberId = memberId;
        receipt.imagePath = imagePath;
        receipt.ocrStatus = STATUS_PENDING;
        receipt.retryCount = 0;
        return receipt;
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

    // OCR 성공 + 파싱 결과 저장(001-02 5장 8단계). 음식점 매칭(claim)은 별도 메서드로 분리.
    public void markSuccess(String ocrRawText, String parsedStoreName, LocalDateTime parsedPaymentDate,
                             Integer parsedTotalAmount, String transactionId) {
        this.ocrStatus = STATUS_SUCCESS;
        this.ocrRawText = ocrRawText;
        this.parsedStoreName = parsedStoreName;
        this.parsedPaymentDate = parsedPaymentDate;
        this.parsedTotalAmount = parsedTotalAmount;
        this.transactionId = transactionId;
    }

    public void markFailed() {
        this.ocrStatus = STATUS_FAILED;
        this.retryCount++;
    }

    // 인식된 상호명이 리뷰 대상 음식점과 일치해 방문 인증에 성공했을 때만 호출(001-02 5장 7단계).
    public void claim(String restaurantId) {
        this.restaurantId = restaurantId;
    }

    public boolean isVerified() {
        return restaurantId != null;
    }

    public Long getReceiptId() {
        return receiptId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getImagePath() {
        return imagePath;
    }

    public String getOcrStatus() {
        return ocrStatus;
    }

    public String getParsedStoreName() {
        return parsedStoreName;
    }

    public LocalDateTime getParsedPaymentDate() {
        return parsedPaymentDate;
    }

    public Integer getParsedTotalAmount() {
        return parsedTotalAmount;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }
}
