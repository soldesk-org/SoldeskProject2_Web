package com.foodtrip.foodsearch.receipt.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.receipt.entity.OcrProcessingLog;

public interface OcrProcessingLogRepository extends JpaRepository<OcrProcessingLog, Long> {
}
