package com.foodtrip.foodsearch.terms.dto;

public class TermsVersionCreateResponseDto {

    private final boolean success;
    private final String message;
    private final Long termsDocumentId;
    private final Long noticeId;

    public TermsVersionCreateResponseDto(boolean success, String message, Long termsDocumentId, Long noticeId) {
        this.success = success;
        this.message = message;
        this.termsDocumentId = termsDocumentId;
        this.noticeId = noticeId;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public Long getTermsDocumentId() {
        return termsDocumentId;
    }

    public Long getNoticeId() {
        return noticeId;
    }
}
