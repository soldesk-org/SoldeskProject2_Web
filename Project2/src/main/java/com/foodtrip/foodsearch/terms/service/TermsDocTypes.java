package com.foodtrip.foodsearch.terms.service;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.terms.entity.TermsDocument;

// docType 경로변수 정규화/검증을 TermsService/NoticeService/AdminTermsService 세 곳에서 공통으로 쓰기
// 위한 작은 유틸(공유 헬퍼 하나 정도는 CLAUDE.md 2장의 "과한 공통화보다 단순함" 원칙과 부딪히지 않는
// 선에서 허용 — 도메인 로직이 아니라 단순 상수 검증이라 중복 유지의 실익이 적음).
public final class TermsDocTypes {

    private TermsDocTypes() {
    }

    public static String normalize(String rawDocType) {
        String docType = rawDocType == null ? "" : rawDocType.trim().toUpperCase();
        if (!TermsDocument.DOC_TYPE_SERVICE.equals(docType) && !TermsDocument.DOC_TYPE_PRIVACY.equals(docType)) {
            throw new CustomException(ErrorCode.TERMS_INVALID_DOC_TYPE);
        }
        return docType;
    }
}
