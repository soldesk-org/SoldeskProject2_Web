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

    // 2026-07-21 신규 추가(001-02 3장) — 중복 리뷰 등록 방지용 고유값.
    // 2026-08-10 수정 — 애초엔 DB UNIQUE 제약으로 막았는데, 그날 "업로드만 하고 리뷰를 끝까지 안 쓴
    // 영수증까지 재사용 못 하게 막던" 오탐 버그를 고치면서 애플리케이션 레벨 중복 판정(리뷰까지 연결된
    // 경우만 차단, ReceiptServiceImpl.isReceiptUsedInReview())으로 옮겼다. DB UNIQUE는 그대로 두면 이제
    // 이 판정과 모순되어(리뷰로 안 이어진 영수증도 같은 값으로 재INSERT를 시도하면 제약 위반 500) 그대로
    // 두면 안 된다 — unique 제거, 중복 차단은 전적으로 애플리케이션 로직이 책임진다.
    @Column(name = "transaction_id", length = 50)
    private String transactionId;

    // 2026-08-10 추가 — 업로드된 이미지 파일 바이트의 SHA-256 해시(중복 검사 보조용, transaction_id를
    // 못 읽은 영수증도 같은 사진 재업로드를 잡아내기 위함). 위 transaction_id와 같은 이유로 DB UNIQUE는
    // 두지 않는다(같은 날 재수정) — 중복 차단은 ReceiptServiceImpl의 리뷰 연결 여부 판정이 담당.
    @Column(name = "image_hash", length = 64)
    private String imageHash;

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

    public static Receipt createPending(Long memberId, String imagePath, String imageHash) {
        Receipt receipt = new Receipt();
        receipt.memberId = memberId;
        receipt.imagePath = imagePath;
        receipt.imageHash = imageHash;
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

    public String getImageHash() {
        return imageHash;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }
}
