package com.foodtrip.foodsearch.terms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.foodtrip.foodsearch.terms.entity.TermsDocument;

public class TermsDocumentDetailResponseDto {

    private final Long termsDocumentId;
    private final String docType;
    private final String versionLabel;
    private final String title;
    private final String content;
    private final LocalDate effectiveDate;
    private final String changeSummary;
    private final LocalDateTime createdAt;

    public TermsDocumentDetailResponseDto(TermsDocument doc) {
        this.termsDocumentId = doc.getTermsDocumentId();
        this.docType = doc.getDocType();
        this.versionLabel = doc.getVersionLabel();
        this.title = doc.getTitle();
        this.content = doc.getContent();
        this.effectiveDate = doc.getEffectiveDate();
        this.changeSummary = doc.getChangeSummary();
        this.createdAt = doc.getCreatedAt();
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
