package com.foodtrip.foodsearch.terms.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.terms.dto.NoticeDetailResponseDto;
import com.foodtrip.foodsearch.terms.dto.TermsDocumentDetailResponseDto;
import com.foodtrip.foodsearch.terms.entity.TermsChangeNotice;
import com.foodtrip.foodsearch.terms.entity.TermsDocument;
import com.foodtrip.foodsearch.terms.repository.TermsChangeNoticeRepository;
import com.foodtrip.foodsearch.terms.repository.TermsDocumentRepository;

@Service
@Transactional(readOnly = true)
public class NoticeServiceImpl implements NoticeService {

    private final TermsChangeNoticeRepository termsChangeNoticeRepository;
    private final TermsDocumentRepository termsDocumentRepository;

    public NoticeServiceImpl(TermsChangeNoticeRepository termsChangeNoticeRepository,
                              TermsDocumentRepository termsDocumentRepository) {
        this.termsChangeNoticeRepository = termsChangeNoticeRepository;
        this.termsDocumentRepository = termsDocumentRepository;
    }

    @Override
    public NoticeDetailResponseDto getNoticeDetail(Long noticeId) {
        TermsChangeNotice notice = termsChangeNoticeRepository.findById(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.TERMS_NOTICE_NOT_FOUND));

        TermsDocumentDetailResponseDto newVersion = termsDocumentRepository.findById(notice.getTermsDocumentId())
                .map(TermsDocumentDetailResponseDto::new)
                .orElseThrow(() -> new CustomException(ErrorCode.TERMS_DOCUMENT_NOT_FOUND));

        TermsDocumentDetailResponseDto previousVersion = null;
        if (notice.getPreviousTermsDocumentId() != null) {
            previousVersion = termsDocumentRepository.findById(notice.getPreviousTermsDocumentId())
                    .map(TermsDocumentDetailResponseDto::new)
                    .orElse(null);
        }

        return new NoticeDetailResponseDto(notice, previousVersion, newVersion);
    }
}
