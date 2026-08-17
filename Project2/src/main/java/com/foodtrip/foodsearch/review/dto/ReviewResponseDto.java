package com.foodtrip.foodsearch.review.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.foodtrip.foodsearch.receipt.dto.ReceiptItemResponseDto;

public class ReviewResponseDto {

    private final Long reviewId;
    private final String nickname;
    // 작성자 프로필 사진(2026-08-10 추가) — Member.profileImageUrl 그대로, 미설정이면 null(프론트가
    // 기본 이니셜 아바타로 대체).
    private final String profileImageUrl;
    private final int rating;
    private final String content;
    private final boolean receiptVerified;
    private final LocalDateTime createdAt;
    // 2026-08-12 추가 — 마이페이지 "내가 쓴 리뷰"에는 있는데 고객 상세 화면엔 없어서 "수정됨" 표시가
    // 여기서만 안 뜨던 걸 발견해 추가.
    private final LocalDateTime updatedAt;
    // 리뷰 태그(2026-07-22 추가) — review_keywords 테이블에서 조회한 값.
    private final List<ReviewKeywordResponseDto> keywords;
    // 리뷰 사진(2026-08-10 추가) — 최대 3장, 등록 순서대로.
    private final List<ReviewImageResponseDto> images;
    // "도움됨" 투표(2026-08-12 추가) — helpfulCount는 항상, helpfulByMe는 로그인 요청일 때만 실제 값
    // (비로그인이면 항상 false).
    private final long helpfulCount;
    private final boolean helpfulByMe;
    // OCR 인식 메뉴(2026-08-18 추가) — Review.menuVisible이 true이고 receiptId가 있을 때만 채워짐
    // (receipt_items를 조회 시점에 조인, 리뷰에 메뉴 데이터를 따로 복제 저장하지 않음). 비공개거나
    // receiptId가 없으면 빈 리스트.
    private final List<ReceiptItemResponseDto> menuItems;

    public ReviewResponseDto(Long reviewId, String nickname, String profileImageUrl, int rating, String content,
                              boolean receiptVerified, LocalDateTime createdAt, LocalDateTime updatedAt,
                              List<ReviewKeywordResponseDto> keywords, List<ReviewImageResponseDto> images,
                              long helpfulCount, boolean helpfulByMe, List<ReceiptItemResponseDto> menuItems) {
        this.reviewId = reviewId;
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.rating = rating;
        this.content = content;
        this.receiptVerified = receiptVerified;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.keywords = keywords;
        this.images = images;
        this.helpfulCount = helpfulCount;
        this.helpfulByMe = helpfulByMe;
        this.menuItems = menuItems;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public String getNickname() {
        return nickname;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public int getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public boolean isReceiptVerified() {
        return receiptVerified;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<ReviewKeywordResponseDto> getKeywords() {
        return keywords;
    }

    public List<ReviewImageResponseDto> getImages() {
        return images;
    }

    public long getHelpfulCount() {
        return helpfulCount;
    }

    public boolean isHelpfulByMe() {
        return helpfulByMe;
    }

    public List<ReceiptItemResponseDto> getMenuItems() {
        return menuItems;
    }
}
