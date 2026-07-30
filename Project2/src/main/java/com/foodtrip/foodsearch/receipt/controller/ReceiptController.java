package com.foodtrip.foodsearch.receipt.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.receipt.dto.ReceiptUploadResponseDto;
import com.foodtrip.foodsearch.receipt.service.ReceiptService;

// 08(영수증OCR) 001-02 6장. 로그인 필수 — 무효 토큰이면 선택적 인증(07 조회 API들)과 달리 바로 401.
@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReceiptUploadResponseDto upload(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                            @RequestParam("restaurantId") String restaurantId,
                                            @RequestParam("restaurantName") String restaurantName,
                                            @RequestParam("image") MultipartFile image) {
        return receiptService.uploadAndParse(authorizationHeader, restaurantId, restaurantName, image);
    }
}
