package com.foodtrip.foodsearch.terms.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.terms.dto.TermsDocumentDetailResponseDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionSummaryResponseDto;
import com.foodtrip.foodsearch.terms.service.TermsService;

// 공개 API — 이용약관/개인정보처리방침 현재 버전 및 과거 버전 열람. docType은 SERVICE|PRIVACY.
@RestController
public class TermsController {

    private final TermsService termsService;

    public TermsController(TermsService termsService) {
        this.termsService = termsService;
    }

    @GetMapping("/api/terms/{docType}")
    public TermsDocumentDetailResponseDto getCurrent(@PathVariable String docType) {
        return termsService.getCurrent(docType);
    }

    @GetMapping("/api/terms/{docType}/versions")
    public List<TermsVersionSummaryResponseDto> listVersions(@PathVariable String docType) {
        return termsService.listVersions(docType);
    }

    @GetMapping("/api/terms/{docType}/versions/{termsDocumentId}")
    public TermsDocumentDetailResponseDto getVersion(@PathVariable String docType,
                                                       @PathVariable Long termsDocumentId) {
        return termsService.getVersion(docType, termsDocumentId);
    }
}
