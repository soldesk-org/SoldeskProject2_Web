package com.foodtrip.foodsearch.receipt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.receipt.entity.Receipt;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

    Optional<Receipt> findByReceiptIdAndDeletedAtIsNull(Long receiptId);

    // 중복 영수증 검사(001-02 3장/5장 6단계) — transaction_id가 이미 다른 영수증에 쓰였는지 확인.
    boolean existsByTransactionId(String transactionId);

    // 2026-08-10 보안 수정 — OCR이 거래번호를 못 읽으면(transactionId=null) 위 검사를 건너뛰어, 거래번호
    // 영역을 가린 같은 영수증 사진을 반복 업로드해 여러 개의 "인증된" 영수증을 만들 수 있었다. 이미지
    // 파일 자체의 해시로도 중복을 잡아, transactionId 추출 성공 여부와 무관하게 같은 사진 재사용을 막는다.
    boolean existsByImageHash(String imageHash);
}
