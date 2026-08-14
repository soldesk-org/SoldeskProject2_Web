package com.foodtrip.foodsearch.terms.dto;

import java.time.LocalDate;

import com.foodtrip.foodsearch.terms.entity.TermsDocument;

public class TermsVersionSummaryResponseDto {

    private final Long termsDocumentId;
    private final String versionLabel;
    private final String title;
    private final LocalDate effectiveDate;
    private final boolean current;

    public TermsVersionSummaryResponseDto(TermsDocument doc, boolean current) {
        this.termsDocumentId = doc.getTermsDocumentId();
        this.versionLabel = doc.getVersionLabel();
        this.title = doc.getTitle();
        this.effectiveDate = doc.getEffectiveDate();
        this.current = current;
    }

    public Long getTermsDocumentId() {
        return termsDocumentId;
    }

    public String getVersionLabel() {
        return versionLabel;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public boolean isCurrent() {
        return current;
    }
}
