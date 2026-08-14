package com.foodtrip.foodsearch.terms.service;

import java.util.List;

import com.foodtrip.foodsearch.terms.dto.TermsDocumentDetailResponseDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionSummaryResponseDto;

public interface TermsService {

    TermsDocumentDetailResponseDto getCurrent(String docType);

    List<TermsVersionSummaryResponseDto> listVersions(String docType);

    TermsDocumentDetailResponseDto getVersion(String docType, Long termsDocumentId);
}
