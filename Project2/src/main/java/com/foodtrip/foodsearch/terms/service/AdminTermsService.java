package com.foodtrip.foodsearch.terms.service;

import java.util.List;

import com.foodtrip.foodsearch.terms.dto.AdminNoticeResponseDto;
import com.foodtrip.foodsearch.terms.dto.CreateTermsVersionRequestDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionCreateResponseDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionSummaryResponseDto;

public interface AdminTermsService {

    TermsVersionCreateResponseDto createVersion(String docType, CreateTermsVersionRequestDto request);

    List<TermsVersionSummaryResponseDto> listVersions(String docType);

    List<AdminNoticeResponseDto> listNotices();
}
