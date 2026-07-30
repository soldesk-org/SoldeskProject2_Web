package com.foodtrip.foodsearch.receipt.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.receipt.entity.OcrProcessingLog;
import com.foodtrip.foodsearch.receipt.entity.Receipt;
import com.foodtrip.foodsearch.receipt.repository.OcrProcessingLogRepository;
import com.foodtrip.foodsearch.receipt.repository.ReceiptRepository;

// ReceiptServiceImpl.uploadAndParse()는 클래스 전체가 @Transactional이라, OCR 실패 시 CustomException을
// 던지면 그 안에서 미리 저장해둔 "실패 기록"(receipt.markFailed()/ocrProcessingLogRepository.save())까지
// 같은 트랜잭션으로 묶여서 통째로 롤백돼버린다 — 정작 실패 이력을 남기려던 목적이 무산되는 버그를
// 2026-07-21 실데이터 테스트(빈 이미지 업로드 후 DB에 실패 로그가 하나도 안 남는 것)로 실제 확인함.
// PROPAGATION.REQUIRES_NEW로 별도 트랜잭션에서 커밋해야 바깥 트랜잭션의 롤백과 무관하게 남는다.
@Component
public class ReceiptFailureRecorder {

    private final ReceiptRepository receiptRepository;
    private final OcrProcessingLogRepository ocrProcessingLogRepository;

    public ReceiptFailureRecorder(ReceiptRepository receiptRepository,
                                   OcrProcessingLogRepository ocrProcessingLogRepository) {
        this.receiptRepository = receiptRepository;
        this.ocrProcessingLogRepository = ocrProcessingLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long receiptId, String errorMessage, long processingTimeMs) {
        receiptRepository.findById(receiptId).ifPresent(Receipt::markFailed);
        ocrProcessingLogRepository.save(OcrProcessingLog.createFailure(receiptId, 1, errorMessage, processingTimeMs));
    }
}
