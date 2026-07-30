package com.foodtrip.foodsearch.receipt.service;

import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.receipt.dto.ReceiptUploadResponseDto;

public interface ReceiptService {

    // 영수증 업로드 → OCR → 방문 인증 판정까지 한 번에 처리한다(001-02 5장). 로그인 필수.
    // restaurantName은 방문 인증 매칭에 쓰는 값 — 2026-07-21부터 음식점 상호명을 DB에 저장하지 않으므로
    // 프론트가 검색 결과에서 이미 들고 있는 값을 함께 보낸다(001-05 참고).
    ReceiptUploadResponseDto uploadAndParse(String authorizationHeader, String restaurantId, String restaurantName,
                                             MultipartFile image);
}
