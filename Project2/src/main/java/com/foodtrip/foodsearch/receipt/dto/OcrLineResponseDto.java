package com.foodtrip.foodsearch.receipt.dto;

// 2026-08-19 추가 — 영수증에서 인식된 한 줄의 위치(0~1 정규화 좌표, 원본 이미지 크기와 무관).
// 촬영 직후 인식 성공 애니메이션에서 실제로 읽은 글자 위에 초록 박스를 그리는 용도.
public class OcrLineResponseDto {

    private final String text;
    private final double x;
    private final double y;
    private final double w;
    private final double h;

    public OcrLineResponseDto(String text, double x, double y, double w, double h) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    public String getText() {
        return text;
    }

    public double getX() {
        return x;
    }

    public double getY() {
        return y;
    }

    public double getW() {
        return w;
    }

    public double getH() {
        return h;
    }
}
