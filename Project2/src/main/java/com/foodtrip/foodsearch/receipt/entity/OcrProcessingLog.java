package com.foodtrip.foodsearch.receipt.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// ocr_processing_logs(DB-테이블설계.md 4-3장) — 시도 회차별 처리 기록. 재시도 API는 없지만(001-02 8장,
// 실패 시 프론트가 새 업로드를 다시 호출하는 방식) 실패 이력 추적용으로 계속 남긴다.
@Entity
@Table(name = "ocr_processing_logs")
public class OcrProcessingLog {

    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_FAILED = "FAILED";
    // Python 서버(receipt-biz-verify)가 RapidOCR(무료 로컬 엔진) + Upstage AI 보정을 함께 쓴다
    // (001-01 참고) — 어느 쪽 결과인지 구분하지 않고 이 값으로 통일해서 기록.
    public static final String PROVIDER_RECEIPT_OCR_SERVER = "RECEIPT_OCR_SERVER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ocr_processing_log_id")
    private Long ocrProcessingLogId;

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "attempt_no", nullable = false)
    private int attemptNo;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "processing_time_ms")
    private Integer processingTimeMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected OcrProcessingLog() {
    }

    public static OcrProcessingLog createSuccess(Long receiptId, int attemptNo, long processingTimeMs) {
        OcrProcessingLog log = new OcrProcessingLog();
        log.receiptId = receiptId;
        log.attemptNo = attemptNo;
        log.provider = PROVIDER_RECEIPT_OCR_SERVER;
        log.status = STATUS_SUCCESS;
        log.processingTimeMs = (int) processingTimeMs;
        return log;
    }

    public static OcrProcessingLog createFailure(Long receiptId, int attemptNo, String errorMessage, long processingTimeMs) {
        OcrProcessingLog log = new OcrProcessingLog();
        log.receiptId = receiptId;
        log.attemptNo = attemptNo;
        log.provider = PROVIDER_RECEIPT_OCR_SERVER;
        log.status = STATUS_FAILED;
        log.errorMessage = errorMessage;
        log.processingTimeMs = (int) processingTimeMs;
        return log;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getOcrProcessingLogId() {
        return ocrProcessingLogId;
    }
}
