package com.foodtrip.foodsearch.terms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.foodtrip.foodsearch.terms.entity.TermsChangeNotice;

public class NoticeSummaryResponseDto {

    private final Long noticeId;
    private final String docType;
    private final String title;
    private final LocalDate effectiveDate;
    private final LocalDateTime postedAt;
    private final String noticeType;

    public NoticeSummaryResponseDto(TermsChangeNotice notice) {
        this.noticeId = notice.getTermsChangeNoticeId();
        this.docType = notice.getDocType();
        this.title = notice.getTitle();
        this.effectiveDate = notice.getEffectiveDate();
        this.postedAt = notice.getPostedAt();
        this.noticeType = notice.getNoticeType();
    }

    public Long getNoticeId() {
        return noticeId;
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

    public LocalDateTime getPostedAt() {
        return postedAt;
    }

    public String getNoticeType() {
        return noticeType;
    }
}
