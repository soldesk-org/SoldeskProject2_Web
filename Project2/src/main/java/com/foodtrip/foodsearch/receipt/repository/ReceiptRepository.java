package com.foodtrip.foodsearch.receipt.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.receipt.entity.Receipt;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

    Optional<Receipt> findByReceiptIdAndDeletedAtIsNull(Long receiptId);

    // 중복 영수증 검사(001-02 3장/5장 6단계) — transaction_id가 이미 다른 영수증에 쓰였는지 확인.
    boolean existsByTransactionId(String transactionId);
}
