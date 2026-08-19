package com.foodtrip.foodsearch.receipt.client;

import java.util.List;

// receipt-biz-verify Python 서버의 POST /parse-receipt 성공 응답(001-01/001-02 참고).
public record ReceiptOcrResult(
        String storeName,
        String orderDatetime,
        List<MenuItemResult> menuItems,
        Integer totalPrice,
        String transactionId,
        // 2026-08-19 추가 — RapidOCR이 인식한 각 줄의 위치(0~1 정규화 좌표). 촬영 직후 인식 성공
        // 애니메이션에서 실제로 읽은 글자 위에 초록 박스를 그리는 용도(receipt-upload.js 참고).
        // 값이 없어도(구버전 Python 응답 등) 기본값 빈 리스트로 안전하게 처리.
        List<OcrLineResult> ocrLines) {

    public record OcrLineResult(String text, double x, double y, double w, double h) {
    }

    public record MenuItemResult(String name, Integer price) {

        // 2026-08-06 추가 - OCR이 가끔 도장/로고 같은 무의미한 텍스트를 메뉴 항목처럼 잘못 인식한다
        // ("lo 8원"처럼 이름이 한두 글자에 가격도 비현실적으로 낮은 사례가 실제로 보고됨). 저장 시점
        // (ReceiptSuccessRecorder)과 업로드 응답(ReceiptServiceImpl) 둘 다 이 판정을 그대로 써서,
        // 화면에 보이는 것과 DB에 저장되는 것이 항상 같은 기준을 따르게 한다.
        public boolean isPlausible() {
            String trimmed = name == null ? "" : name.trim();
            if (trimmed.length() < 2) {
                return false;
            }
            return price == null || price >= 500;
        }
    }
}
