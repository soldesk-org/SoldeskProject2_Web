package com.foodtrip.foodsearch.terms.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 약관 변경 공지 게시판(신규, 2026-08-14) — member 개인별 알림 벨(notification 패키지)과는 완전히 별개의
// "공개 공지 게시판"이다(요구사항에서 명시적으로 구분 지시함). 새 약관/개인정보처리방침 버전을 등록할 때
// 관리자 화면에서 한 번에 같이 만들어지는 게 기본 경로다(AdminTermsServiceImpl.createVersion 참고,
// "필요한 만큼만" 원칙에 따라 별도 API 두 번 호출 대신 하나로 묶음). previousTermsDocumentId는 최초
// 버전(그 문서 타입의 1번째 버전)에는 비교 대상이 없어 null이 될 수 있다.
@Entity
@Table(name = "terms_change_notices")
public class TermsChangeNotice {

    public static final String NOTICE_TYPE_MINOR = "MINOR";
    public static final String NOTICE_TYPE_MAJOR = "MAJOR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "terms_change_notice_id")
    private Long termsChangeNoticeId;

    // 새로 게시되는 버전. 실제 내용 조회는 TermsDocumentRepository로 별도 조회한다(연관관계 매핑 없이
    // ID만 들고 있는 것은 이 프로젝트가 review_reports.review_id 등에서 이미 쓰는 관례).
    @Column(name = "terms_document_id", nullable = false)
    private Long termsDocumentId;

    @Column(name = "previous_terms_document_id")
    private Long previousTermsDocumentId;

    // 목록/상세 화면에서 join 없이 바로 쓰기 위한 스냅샷 컬럼 — 11(마이페이지)의 "음식점 이름 스냅샷"과
    // 같은 절충(CLAUDE.md 참고).
    @Column(name = "doc_type", nullable = false, length = 20)
    private String docType;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "notice_type", nullable = false, length = 10)
    private String noticeType;

    @Column(name = "posted_at", nullable = false, updatable = false)
    private LocalDateTime postedAt;

    @Column(name = "created_by_admin_member_id")
    private Long createdByAdminMemberId;

    protected TermsChangeNotice() {
    }

    public static TermsChangeNotice create(Long termsDocumentId, Long previousTermsDocumentId, String docType,
                                            String title, LocalDate effectiveDate, String noticeType,
                                            Long createdByAdminMemberId) {
        TermsChangeNotice notice = new TermsChangeNotice();
        notice.termsDocumentId = termsDocumentId;
        notice.previousTermsDocumentId = previousTermsDocumentId;
        notice.docType = docType;
        notice.title = title;
        notice.effectiveDate = effectiveDate;
        notice.noticeType = noticeType;
        notice.createdByAdminMemberId = createdByAdminMemberId;
        return notice;
    }

    @PrePersist
    protected void onCreate() {
        this.postedAt = LocalDateTime.now();
    }

    public Long getTermsChangeNoticeId() {
        return termsChangeNoticeId;
    }

    public Long getTermsDocumentId() {
        return termsDocumentId;
    }

    public Long getPreviousTermsDocumentId() {
        return previousTermsDocumentId;
    }

    public String getDocType() {
        return docType;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public String getNoticeType() {
        return noticeType;
    }

    public LocalDateTime getPostedAt() {
        return postedAt;
    }

    public Long getCreatedByAdminMemberId() {
        return createdByAdminMemberId;
    }
}
