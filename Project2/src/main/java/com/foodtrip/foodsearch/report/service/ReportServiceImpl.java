package com.foodtrip.foodsearch.report.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.report.dto.CreateReportRequestDto;
import com.foodtrip.foodsearch.report.dto.ReportActionResponseDto;
import com.foodtrip.foodsearch.report.entity.ReviewReport;
import com.foodtrip.foodsearch.report.repository.ReviewReportRepository;
import com.foodtrip.foodsearch.review.repository.ReviewRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 16(리뷰-신고) — 로그인 필수(작성과 동일 톤, resolveMemberId 패턴은 review/review 패키지 등에서 이미
// 여러 번 복제해서 쓰던 것을 그대로 다시 복제함 — CLAUDE.md 2장 "각자 작은 private 메서드로 중복 유지" 원칙).
@Service
public class ReportServiceImpl implements ReportService {

    private final ReviewReportRepository reviewReportRepository;
    private final ReviewRepository reviewRepository;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public ReportServiceImpl(ReviewReportRepository reviewReportRepository, ReviewRepository reviewRepository,
                              JwtProvider jwtProvider, AccessTokenSessionService accessTokenSessionService) {
        this.reviewReportRepository = reviewReportRepository;
        this.reviewRepository = reviewRepository;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    @Transactional
    public ReportActionResponseDto reportReview(Long reviewId, String authorizationHeader,
                                                 CreateReportRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);

        reviewRepository.findByReviewIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        if (!ReportReasonCatalog.isValid(request.getReasonCode())) {
            throw new CustomException(ErrorCode.REPORT_REASON_NOT_ALLOWED);
        }

        if (reviewReportRepository.existsByReviewIdAndReporterMemberId(reviewId, memberId)) {
            throw new CustomException(ErrorCode.REVIEW_ALREADY_REPORTED);
        }

        reviewReportRepository.save(ReviewReport.create(reviewId, memberId, request.getReasonCode(),
                request.getDetail()));

        return new ReportActionResponseDto(true, "신고가 접수되었습니다.");
    }

    private Long resolveMemberId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        Claims claims;
        try {
            claims = jwtProvider.parseClaims(accessToken);
        } catch (JwtException e) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        if (!accessTokenSessionService.isActive(claims.getId())) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        return Long.valueOf(claims.getSubject());
    }
}
