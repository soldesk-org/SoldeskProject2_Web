package com.foodtrip.foodsearch.terms.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 이용약관/개인정보처리방침 버전 관리 신규 개발(2026-08-14) — 기존에는 static/terms-service.html,
// terms-privacy.html이 순수 정적 페이지라 버전 개념이 전혀 없었다. 이 엔티티가 그 두 문서의 "버전 하나"를
// 나타낸다(docType으로 구분). is_current를 별도 컬럼으로 두지 않고 "effectiveDate <= 오늘인 것 중 가장
// 최신"으로 매 조회마다 계산한다(TermsServiceImpl.resolveCurrent 참고) — 컬럼으로 관리하면 새 버전을
// 등록할 때마다 이전 current를 false로 갱신하는 로직이 추가로 필요해지는데, "시행일자 기준으로 자동
// 전환"이 이 기능의 핵심 요구사항이라 파생 계산이 더 정확하고 단순하다(예약된 미래 버전도 시행일 전까지는
// 자동으로 "아직 아님" 상태를 유지).
//
// noticeType/docType은 review_reports.status 등 이 프로젝트 전반의 관례를 따라 진짜 JPA enum이 아니라
// 문자열 상수로 관리한다(ddl-auto=update 환경에서 네이티브 ENUM 컬럼을 매핑하면 스키마 변경 시도 위험이
// 있다는 것이 review_keywords 테이블 사례로 이미 확인된 바 있다 — CLAUDE.md 참고).
@Entity
@Table(name = "terms_documents")
public class TermsDocument {

    public static final String DOC_TYPE_SERVICE = "SERVICE";
    public static final String DOC_TYPE_PRIVACY = "PRIVACY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "terms_document_id")
    private Long termsDocumentId;

    @Column(name = "doc_type", nullable = false, length = 20)
    private String docType;

    // 화면에 노출되는 버전 라벨(예: "2026-08-01"). 관리자가 직접 안 주면 effectiveDate로부터 자동 생성한다.
    @Column(name = "version_label", nullable = false, length = 40)
    private String versionLabel;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Lob
    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Lob
    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected TermsDocument() {
    }

    public static TermsDocument create(String docType, String versionLabel, String title, String content,
                                        LocalDate effectiveDate, String changeSummary) {
        TermsDocument doc = new TermsDocument();
        doc.docType = docType;
        doc.versionLabel = versionLabel;
        doc.title = title;
        doc.content = content;
        doc.effectiveDate = effectiveDate;
        doc.changeSummary = changeSummary;
        return doc;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getTermsDocumentId() {
        return termsDocumentId;
    }

    public String getDocType() {
        return docType;
    }

    public String getVersionLabel() {
        return versionLabel;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public String getChangeSummary() {
        return changeSummary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
