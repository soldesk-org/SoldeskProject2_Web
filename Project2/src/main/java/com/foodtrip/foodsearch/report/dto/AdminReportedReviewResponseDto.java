package com.foodtrip.foodsearch.report.dto;

import java.time.LocalDateTime;

public class AdminReportedReviewResponseDto {

    private final Long reviewId;
    private final String authorNickname;
    private final String restaurantName;
    private final int rating;
    private final String content;
    private final long reportCount;
    private final String latestReasonCode;
    private final LocalDateTime latestReportedAt;
    // 이 목록을 어떤 status로 조회했는지(PENDING/RESOLVED/REJECTED, 2026-07-23 2차 추가) 그대로 돌려준다 —
    // 프론트가 목록 탭(대기중/처리완료/반려)에 따라 다른 배지를 보여줄 때 이 값을 그대로 쓰면 된다.
    private final String status;
    // 신고 1건=1행이 아니라 리뷰 단위로 묶여있어(한 리뷰를 여러 명이 신고할 수 있음) "신고자"를 하나로
    // 정하기 애매했는데, 화면에 이미 latestReasonCode/latestReportedAt로 "가장 최근 신고" 기준을 쓰고
    // 있어서 신고자도 같은 기준(가장 최근 신고)으로 통일한다(2026-08-13 추가).
    private final String latestReporterNickname;

    public AdminReportedReviewResponseDto(Long reviewId, String authorNickname, String restaurantName, int rating,
                                           String content, long reportCount, String latestReasonCode,
                                           LocalDateTime latestReportedAt, String status, String latestReporterNickname) {
        this.reviewId = reviewId;
        this.authorNickname = authorNickname;
        this.restaurantName = restaurantName;
        this.rating = rating;
        this.content = content;
        this.reportCount = reportCount;
        this.latestReasonCode = latestReasonCode;
        this.latestReportedAt = latestReportedAt;
        this.status = status;
        this.latestReporterNickname = latestReporterNickname;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public String getAuthorNickname() {
        return authorNickname;
    }

    public String getRestaurantName() {
        return restaurantName;
    }

    public int getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public long getReportCount() {
        return reportCount;
    }

    public String getLatestReasonCode() {
        return latestReasonCode;
    }

    public LocalDateTime getLatestReportedAt() {
        return latestReportedAt;
    }

    public String getStatus() {
        return status;
    }

    public String getLatestReporterNickname() {
        return latestReporterNickname;
    }
}
