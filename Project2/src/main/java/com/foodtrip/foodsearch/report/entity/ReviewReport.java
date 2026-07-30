package com.foodtrip.foodsearch.report.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// 16(리뷰-신고) — 14(관리자-권한)의 "신고 관리 - 신고된 리뷰 관리" 요청으로 신규 개발. 회원이 리뷰를
// 신고하면(ReportServiceImpl) 이 테이블에 쌓이고, 관리자(AdminReportServiceImpl)가 리뷰 단위로 모아
// 확인 후 RESOLVED(신고 내용이 맞아서 조치함)나 REJECTED(신고를 검토했지만 조치할 필요 없다고 판단, 2차
// 추가)로 처리한다. 실제 리뷰를 지우고 싶으면 10.리뷰/14.관리자-권한에 이미 있는 관리자 강제 삭제
// (DELETE /api/admin/reviews/{id})를 별도로 호출해야 한다 — "신고 처리"와 "리뷰 삭제"는 별개 액션이다.
@Entity
@Table(name = "review_reports", uniqueConstraints = @UniqueConstraint(columnNames = {"review_id", "reporter_member_id"}))
public class ReviewReport {

    public static final String STATUS_PENDING = "PENDING";
    // 처리 완료 - 신고 내용을 확인하고 실제로 조치(예: 리뷰 삭제)했거나 조치가 필요하다고 판단한 경우.
    public static final String STATUS_RESOLVED = "RESOLVED";
    // 처리 불가/반려(2026-07-23 2차 추가) - 신고를 검토했지만 근거가 없거나 조치할 필요가 없다고 판단한 경우.
    // RESOLVED와 REJECTED 둘 다 "PENDING을 벗어난 상태"라는 점은 같지만, "실제로 무언가 조치했는지"를
    // 구분하기 위해 별도 상태로 분리했다(그냥 하나의 "처리됨"으로 합치면 관리자가 나중에 이력을 볼 때
    // 그 신고가 타당했는지 아닌지 구분이 안 됨).
    public static final String STATUS_REJECTED = "REJECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_report_id")
    private Long reviewReportId;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "reporter_member_id", nullable = false)
    private Long reporterMemberId;

    // 고정 사유 목록(ReportReasonCatalog) 중 하나 — 10.리뷰의 ReviewKeywordCatalog와 같은 패턴(코드가
    // 허용 목록의 유일한 출처).
    @Column(name = "reason_code", nullable = false, length = 30)
    private String reasonCode;

    @Column(name = "detail", length = 500)
    private String detail;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    protected ReviewReport() {
    }

    public static ReviewReport create(Long reviewId, Long reporterMemberId, String reasonCode, String detail) {
        ReviewReport report = new ReviewReport();
        report.reviewId = reviewId;
        report.reporterMemberId = reporterMemberId;
        report.reasonCode = reasonCode;
        report.detail = detail;
        report.status = STATUS_PENDING;
        return report;
    }

    public void resolve() {
        this.status = STATUS_RESOLVED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void reject() {
        this.status = STATUS_REJECTED;
        this.resolvedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getReviewReportId() {
        return reviewReportId;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public Long getReporterMemberId() {
        return reporterMemberId;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public String getDetail() {
        return detail;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }
}
