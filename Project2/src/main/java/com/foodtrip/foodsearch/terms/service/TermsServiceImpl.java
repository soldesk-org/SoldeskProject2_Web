package com.foodtrip.foodsearch.terms.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.terms.dto.TermsDocumentDetailResponseDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionSummaryResponseDto;
import com.foodtrip.foodsearch.terms.entity.TermsDocument;
import com.foodtrip.foodsearch.terms.repository.TermsDocumentRepository;

@Service
@Transactional(readOnly = true)
public class TermsServiceImpl implements TermsService {

    private final TermsDocumentRepository termsDocumentRepository;

    public TermsServiceImpl(TermsDocumentRepository termsDocumentRepository) {
        this.termsDocumentRepository = termsDocumentRepository;
    }

    @Override
    public TermsDocumentDetailResponseDto getCurrent(String rawDocType) {
        String docType = TermsDocTypes.normalize(rawDocType);
        TermsDocument current = resolveCurrent(docType);
        return new TermsDocumentDetailResponseDto(current);
    }

    @Override
    public List<TermsVersionSummaryResponseDto> listVersions(String rawDocType) {
        String docType = TermsDocTypes.normalize(rawDocType);
        TermsDocument current = termsDocumentRepository
                .findFirstByDocTypeAndEffectiveDateLessThanEqualOrderByEffectiveDateDescTermsDocumentIdDesc(
                        docType, LocalDate.now())
                .orElse(null);
        List<TermsDocument> all = termsDocumentRepository.findAllByDocTypeOrderByEffectiveDateDescTermsDocumentIdDesc(docType);
        return all.stream()
                .map(doc -> new TermsVersionSummaryResponseDto(doc,
                        current != null && current.getTermsDocumentId().equals(doc.getTermsDocumentId())))
                .toList();
    }

    @Override
    public TermsDocumentDetailResponseDto getVersion(String rawDocType, Long termsDocumentId) {
        String docType = TermsDocTypes.normalize(rawDocType);
        TermsDocument doc = termsDocumentRepository.findByTermsDocumentIdAndDocType(termsDocumentId, docType)
                .orElseThrow(() -> new CustomException(ErrorCode.TERMS_DOCUMENT_NOT_FOUND));
        return new TermsDocumentDetailResponseDto(doc);
    }

    // 시행일이 오늘 이하인 것 중 가장 최근 것 → 없으면(전부 미래 예약본만 있는 경우) 그래도 뭔가는 보여줘야
    // 하므로 시행일이 가장 이른 버전으로 폴백한다.
    private TermsDocument resolveCurrent(String docType) {
        return termsDocumentRepository
                .findFirstByDocTypeAndEffectiveDateLessThanEqualOrderByEffectiveDateDescTermsDocumentIdDesc(
                        docType, LocalDate.now())
                .or(() -> termsDocumentRepository.findFirstByDocTypeOrderByEffectiveDateDescTermsDocumentIdDesc(docType))
                .orElseThrow(() -> new CustomException(ErrorCode.TERMS_DOCUMENT_NOT_FOUND));
    }
}
