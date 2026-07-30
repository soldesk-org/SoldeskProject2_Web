package com.foodtrip.foodsearch.report.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.report.entity.ReviewReport;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {

    boolean existsByReviewIdAndReporterMemberId(Long reviewId, Long reporterMemberId);

    List<ReviewReport> findByReviewIdAndStatus(Long reviewId, String status);

    // 관리자 대시보드(2026-07-23 추가) — "신고된 리뷰 수"는 신고 건수가 아니라 신고당한 "리뷰"의 개수다
    // (한 리뷰에 신고가 여러 건 달릴 수 있으므로 distinct).
    @Query("SELECT COUNT(DISTINCT r.reviewId) FROM ReviewReport r WHERE r.status = :status")
    long countDistinctReviewsByStatus(@Param("status") String status);

    // 신고 관리 목록 - 리뷰 단위로 묶어서 신고 건수/최신 신고 시각을 함께 뽑는다. AdminReportServiceImpl이
    // 이 결과의 reviewId로 Review/Member를 다시 조회해서 화면에 필요한 나머지 정보(작성자 닉네임, 음식점명,
    // 별점/내용 등)를 채운다(관리자 리뷰 목록과 동일한 배치 조회 패턴, AdminServiceImpl.listReviews() 참고).
    @Query("SELECT r.reviewId AS reviewId, COUNT(r) AS reportCount, MAX(r.createdAt) AS latestReportedAt "
            + "FROM ReviewReport r WHERE r.status = :status GROUP BY r.reviewId ORDER BY MAX(r.createdAt) DESC")
    List<ReportedReviewSummary> findReportedReviewSummaries(@Param("status") String status);

    interface ReportedReviewSummary {
        Long getReviewId();

        Long getReportCount();

        java.time.LocalDateTime getLatestReportedAt();
    }
}
