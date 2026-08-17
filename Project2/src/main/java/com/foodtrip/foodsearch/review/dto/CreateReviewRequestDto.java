package com.foodtrip.foodsearch.review.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateReviewRequestDto {

    @NotNull(message = "restaurantId는 필수입니다.")
    private String restaurantId;

    @NotNull(message = "평점은 필수입니다.")
    @Min(value = 1, message = "평점은 1~5 사이여야 합니다.")
    @Max(value = 5, message = "평점은 1~5 사이여야 합니다.")
    private Integer rating;

    @Size(max = 1000, message = "리뷰 내용은 최대 1000자입니다.")
    private String content;

    // 리뷰 태그(2026-07-22 추가) — ReviewKeywordCatalog에 있는 값만 허용(ReviewServiceImpl에서 검증).
    // content가 비어있어도 태그가 하나 이상 있으면 등록 가능(반대도 마찬가지).
    private List<String> keywords;

    // 영수증 인증 필수(2026-07-23 정책 변경 — 이전엔 선택이었음). ReceiptServiceImpl.uploadAndParse()
    // 응답의 receiptId를 그대로 넘겨야 하며, 본인 소유 + 이 음식점으로 인증된 영수증이 아니면
    // ReviewServiceImpl.create()가 REVIEW_RECEIPT_NOT_VERIFIED로 거부한다.
    @NotNull(message = "영수증 인증 후에만 리뷰를 작성할 수 있습니다.")
    private Long receiptId;

    // OCR로 읽은 메뉴 공개 여부(2026-08-18 추가) — step2에서 사용자가 고른 값. 안 보내면(구버전 프론트 등)
    // 기본값 공개(true)로 처리한다(서비스 레이어에서 null 처리, ReviewServiceImpl.create() 참고).
    private Boolean menuVisible;

    // 마이페이지(11) "내 리뷰"/"방문기록" 목록 표시용 스냅샷(2026-07-22 추가, Review 엔티티 주석 참고).
    // restaurantName은 필수 — 08(영수증OCR)의 restaurantName 파라미터와 같은 이유(카카오 데이터 미저장 원칙).
    @NotBlank(message = "restaurantName은 필수입니다.")
    private String restaurantName;

    private String address;
    private String roadAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;

    protected CreateReviewRequestDto() {
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public Integer getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public List<String> getKeywords() {
        return keywords;
    }

    public Long getReceiptId() {
        return receiptId;
    }

    public Boolean getMenuVisible() {
        return menuVisible;
    }

    public String getRestaurantName() {
        return restaurantName;
    }

    public String getAddress() {
        return address;
    }

    public String getRoadAddress() {
        return roadAddress;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }
}
