package com.foodtrip.foodsearch.receipt.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.receipt.client.ReceiptOcrResult;
import com.foodtrip.foodsearch.receipt.entity.OcrProcessingLog;
import com.foodtrip.foodsearch.receipt.entity.Receipt;
import com.foodtrip.foodsearch.receipt.entity.ReceiptItem;
import com.foodtrip.foodsearch.receipt.repository.OcrProcessingLogRepository;
import com.foodtrip.foodsearch.receipt.repository.ReceiptItemRepository;
import com.foodtrip.foodsearch.receipt.repository.ReceiptRepository;

// OCR 성공 이후 저장 작업(receipts 갱신 + receipt_items 저장 + 성공 로그)을 하나의 트랜잭션으로 묶는다.
// ReceiptFailureRecorder와 대칭되는 구조 — ReceiptServiceImpl이 더 이상 클래스 전체를 @Transactional로
// 감싸지 않는 이유는 그 주석 참고(2026-07-21 실데이터 테스트로 발견한 롤백 버그).
@Component
public class ReceiptSuccessRecorder {

    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final OcrProcessingLogRepository ocrProcessingLogRepository;

    public ReceiptSuccessRecorder(ReceiptRepository receiptRepository,
                                   ReceiptItemRepository receiptItemRepository,
                                   OcrProcessingLogRepository ocrProcessingLogRepository) {
        this.receiptRepository = receiptRepository;
        this.receiptItemRepository = receiptItemRepository;
        this.ocrProcessingLogRepository = ocrProcessingLogRepository;
    }

    @Transactional
    public boolean record(Long receiptId, ReceiptOcrResult result, String rawJson, LocalDateTime parsedPaymentDate,
                           boolean verified, String restaurantId, long processingTimeMs) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new CustomException(ErrorCode.RECEIPT_NOT_FOUND));
        receipt.markSuccess(rawJson, result.storeName(), parsedPaymentDate, result.totalPrice(), result.transactionId());
        if (verified) {
            receipt.claim(restaurantId);
        }

        for (ReceiptOcrResult.MenuItemResult item : result.menuItems()) {
            if (!item.isPlausible()) {
                continue;
            }
            receiptItemRepository.save(ReceiptItem.create(receiptId, item.name(), item.price()));
        }

        ocrProcessingLogRepository.save(OcrProcessingLog.createSuccess(receiptId, 1, processingTimeMs));
        return verified;
    }
}
