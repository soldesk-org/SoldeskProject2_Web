package com.foodtrip.foodsearch.business.dto;

import java.math.BigDecimal;

// 사업자 마이페이지 "내 매장 관리" 통계 카드(2026-08-06 추가) — GET /api/business/me/stats.
// "이번 달 조회수"는 조회수 자체를 기록하는 곳이 이 프로젝트에 없어 뺐다(지어낸 수치 금지 원칙,
// business-mypage.js의 기존 코드 주석 참고).
public class BusinessStatsResponseDto {

    private final long totalReviewCount;
    private final BigDecimal avgRating;
    private final long favoriteCount;
    private final long visitCertThisMonth;

    public BusinessStatsResponseDto(long totalReviewCount, BigDecimal avgRating, long favoriteCount,
                                     long visitCertThisMonth) {
        this.totalReviewCount = totalReviewCount;
        this.avgRating = avgRating;
        this.favoriteCount = favoriteCount;
        this.visitCertThisMonth = visitCertThisMonth;
    }

    public long getTotalReviewCount() {
        return totalReviewCount;
    }

    public BigDecimal getAvgRating() {
        return avgRating;
    }

    public long getFavoriteCount() {
        return favoriteCount;
    }

    public long getVisitCertThisMonth() {
        return visitCertThisMonth;
    }
}
