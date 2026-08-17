package com.foodtrip.foodsearch.receipt.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.receipt.entity.ReceiptItem;

public interface ReceiptItemRepository extends JpaRepository<ReceiptItem, Long> {

    List<ReceiptItem> findByReceiptId(Long receiptId);

    // 리뷰 목록에서 여러 리뷰의 공개 메뉴를 한 번에 조회하기 위한 배치 조회(2026-08-18 추가,
    // ReviewServiceImpl.listByRestaurant()).
    List<ReceiptItem> findByReceiptIdIn(List<Long> receiptIds);
}
