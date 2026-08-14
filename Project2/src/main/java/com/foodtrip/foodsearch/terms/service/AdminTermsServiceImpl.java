package com.foodtrip.foodsearch.terms.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.terms.dto.AdminNoticeResponseDto;
import com.foodtrip.foodsearch.terms.dto.CreateTermsVersionRequestDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionCreateResponseDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionSummaryResponseDto;
import com.foodtrip.foodsearch.terms.entity.TermsChangeNotice;
import com.foodtrip.foodsearch.terms.entity.TermsDocument;
import com.foodtrip.foodsearch.terms.repository.TermsChangeNoticeRepository;
import com.foodtrip.foodsearch.terms.repository.TermsDocumentRepository;

// 관리자 "약관 관리" — 새 버전 등록 + 변경 공지 게시를 한 액션으로 묶는다(요구사항 3번 항목의 지침).
// "작은 변경(14일 전)/큰 변경(30일 전)" 사전 고지 규칙은 여기, 새 버전을 등록하는 이 시점에 딱 한 곳에서
// 검증한다 — 이 프로젝트가 다른 도메인(예: 17.리뷰-필터링의 korcen 검사)에서도 그렇듯 "업무 규칙은 그 규칙이
// 실제로 적용되는 단일 지점에서" 강제하는 패턴을 따른다.
@Service
@Transactional
public class AdminTermsServiceImpl implements AdminTermsService {

    private static final DateTimeFormatter VERSION_LABEL_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final TermsDocumentRepository termsDocumentRepository;
    private final TermsChangeNoticeRepository termsChangeNoticeRepository;

    public AdminTermsServiceImpl(TermsDocumentRepository termsDocumentRepository,
                                  TermsChangeNoticeRepository termsChangeNoticeRepository) {
        this.termsDocumentRepository = termsDocumentRepository;
        this.termsChangeNoticeRepository = termsChangeNoticeRepository;
    }

    @Override
    public TermsVersionCreateResponseDto createVersion(String rawDocType, CreateTermsVersionRequestDto request) {
        String docType = TermsDocTypes.normalize(rawDocType);

        TermsDocument previous = termsDocumentRepository
                .findFirstByDocTypeOrderByEffectiveDateDescTermsDocumentIdDesc(docType)
                .orElse(null);

        String noticeType = request.getNoticeType() == null ? null : request.getNoticeType().trim().toUpperCase();

        if (previous != null) {
            // 이전 버전이 있는(=이용자 입장에서 "변경"인) 경우에만 14/30일 규칙과 noticeType이 필요하다.
            if (!TermsChangeNotice.NOTICE_TYPE_MINOR.equals(noticeType)
                    && !TermsChangeNotice.NOTICE_TYPE_MAJOR.equals(noticeType)) {
                throw new CustomException(ErrorCode.TERMS_NOTICE_TYPE_REQUIRED);
            }
            int requiredLeadDays = TermsChangeNotice.NOTICE_TYPE_MAJOR.equals(noticeType) ? 30 : 14;
            long actualLeadDays = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), request.getEffectiveDate());
            if (actualLeadDays < requiredLeadDays) {
                throw new CustomException(ErrorCode.TERMS_NOTICE_LEAD_TIME_TOO_SHORT,
                        (TermsChangeNotice.NOTICE_TYPE_MAJOR.equals(noticeType) ? "큰 변경" : "작은 변경")
                                + "은 시행일 " + requiredLeadDays + "일 전까지 등록해야 합니다. (현재 " + actualLeadDays + "일 전)");
            }
        }

        String versionLabel = (request.getVersionLabel() == null || request.getVersionLabel().isBlank())
                ? request.getEffectiveDate().format(VERSION_LABEL_FORMAT)
                : request.getVersionLabel().trim();

        TermsDocument saved = termsDocumentRepository.save(TermsDocument.create(
                docType, versionLabel, request.getTitle(), request.getContent(),
                request.getEffectiveDate(), request.getChangeSummary()));

        Long noticeId = null;
        if (previous != null) {
            TermsChangeNotice notice = TermsChangeNotice.create(
                    saved.getTermsDocumentId(), previous.getTermsDocumentId(), docType,
                    docTypeLabel(docType) + " 개정 안내 (v" + versionLabel + ")",
                    request.getEffectiveDate(), noticeType, resolveCurrentAdminMemberId());
            noticeId = termsChangeNoticeRepository.save(notice).getTermsChangeNoticeId();
        }

        return new TermsVersionCreateResponseDto(true,
                previous == null ? "첫 버전이 등록되었습니다." : "새 버전이 등록되고 변경 공지가 게시되었습니다.",
                saved.getTermsDocumentId(), noticeId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TermsVersionSummaryResponseDto> listVersions(String rawDocType) {
        String docType = TermsDocTypes.normalize(rawDocType);
        TermsDocument current = termsDocumentRepository
                .findFirstByDocTypeAndEffectiveDateLessThanEqualOrderByEffectiveDateDescTermsDocumentIdDesc(
                        docType, LocalDate.now())
                .orElse(null);
        return termsDocumentRepository.findAllByDocTypeOrderByEffectiveDateDescTermsDocumentIdDesc(docType).stream()
                .map(doc -> new TermsVersionSummaryResponseDto(doc,
                        current != null && current.getTermsDocumentId().equals(doc.getTermsDocumentId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminNoticeResponseDto> listNotices() {
        return termsChangeNoticeRepository.findAllByOrderByPostedAtDesc().stream()
                .map(AdminNoticeResponseDto::new)
                .toList();
    }

    private String docTypeLabel(String docType) {
        return TermsDocument.DOC_TYPE_PRIVACY.equals(docType) ? "개인정보처리방침" : "서비스 이용약관";
    }

    // JwtAuthenticationFilter가 principal에 memberId(subject) 문자열을 그대로 넣어둔다(공통 규약).
    private Long resolveCurrentAdminMemberId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        try {
            return Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
