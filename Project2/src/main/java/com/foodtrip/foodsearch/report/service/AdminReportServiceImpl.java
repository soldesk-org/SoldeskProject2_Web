package com.foodtrip.foodsearch.report.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.report.dto.AdminReportedReviewResponseDto;
import com.foodtrip.foodsearch.report.dto.ReportActionResponseDto;
import com.foodtrip.foodsearch.report.entity.ReviewReport;
import com.foodtrip.foodsearch.report.repository.ReviewReportRepository;
import com.foodtrip.foodsearch.report.repository.ReviewReportRepository.ReportedReviewSummary;
import com.foodtrip.foodsearch.review.entity.Review;
import com.foodtrip.foodsearch.review.repository.ReviewRepository;

// 14(관리자-권한) "신고 관리 - 신고된 리뷰 관리" 요청으로 신규 개발(16.리뷰-신고). AdminServiceImpl과
// 마찬가지로 이 서비스도 컨트롤러 단에서 이미 ADMIN 권한이 확인된 뒤 호출되므로 별도 인증 코드가 없다.
@Service
public class AdminReportServiceImpl implements AdminReportService {

    private final ReviewReportRepository reviewReportRepository;
    private final ReviewRepository reviewRepository;
    private final MemberRepository memberRepository;

    public AdminReportServiceImpl(ReviewReportRepository reviewReportRepository, ReviewRepository reviewRepository,
                                   MemberRepository memberRepository) {
        this.reviewReportRepository = reviewReportRepository;
        this.reviewRepository = reviewRepository;
        this.memberRepository = memberRepository;
    }

    @Override
    public List<AdminReportedReviewResponseDto> listReportedReviews(String status) {
        String targetStatus = StringUtils.hasText(status) ? status : ReviewReport.STATUS_PENDING;

        List<ReportedReviewSummary> summaries = reviewReportRepository.findReportedReviewSummaries(targetStatus);
        if (summaries.isEmpty()) {
            return List.of();
        }

        List<Long> reviewIds = summaries.stream().map(ReportedReviewSummary::getReviewId).toList();
        Map<Long, Review> reviewsById = reviewRepository.findAllById(reviewIds).stream()
                .collect(Collectors.toMap(Review::getReviewId, r -> r));

        List<Long> memberIds = reviewsById.values().stream().map(Review::getMemberId).distinct().toList();
        Map<Long, String> nicknameByMemberId = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getNickname));

        return summaries.stream()
                .map(summary -> toDto(summary, reviewsById.get(summary.getReviewId()), nicknameByMemberId,
                        targetStatus))
                .filter(dto -> dto != null)
                .toList();
    }

    private AdminReportedReviewResponseDto toDto(ReportedReviewSummary summary, Review review,
                                                  Map<Long, String> nicknameByMemberId, String status) {
        if (review == null) {
            return null; // 리뷰가 이미 삭제된 경우 - 신고 목록에서는 제외(관리자가 볼 대상이 없어짐)
        }
        List<ReviewReport> reports = reviewReportRepository.findByReviewIdAndStatus(summary.getReviewId(), status);
        ReviewReport latestReport = reports.stream()
                .max((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .orElse(null);
        String latestReason = latestReport != null ? latestReport.getReasonCode() : null;
        String latestReporterNickname = latestReport != null
                ? memberRepository.findById(latestReport.getReporterMemberId()).map(Member::getNickname).orElse(null)
                : null;

        return new AdminReportedReviewResponseDto(review.getReviewId(), nicknameByMemberId.get(review.getMemberId()),
                review.getRestaurantNameSnapshot(), review.getRating(), review.getContent(),
                summary.getReportCount(), latestReason, summary.getLatestReportedAt(), status, latestReporterNickname);
    }

    @Override
    @Transactional
    public ReportActionResponseDto resolve(Long reviewId) {
        List<ReviewReport> pending =
                reviewReportRepository.findByReviewIdAndStatus(reviewId, ReviewReport.STATUS_PENDING);
        if (pending.isEmpty()) {
            throw new CustomException(ErrorCode.REPORT_NOT_FOUND);
        }
        pending.forEach(ReviewReport::resolve);
        return new ReportActionResponseDto(true, "신고 처리를 완료했습니다.");
    }

    @Override
    @Transactional
    public ReportActionResponseDto reject(Long reviewId) {
        List<ReviewReport> pending =
                reviewReportRepository.findByReviewIdAndStatus(reviewId, ReviewReport.STATUS_PENDING);
        if (pending.isEmpty()) {
            throw new CustomException(ErrorCode.REPORT_NOT_FOUND);
        }
        pending.forEach(ReviewReport::reject);
        return new ReportActionResponseDto(true, "신고를 반려(처리 불가)했습니다.");
    }

    @Override
    public long countPendingReportedReviews() {
        return reviewReportRepository.countDistinctReviewsByStatus(ReviewReport.STATUS_PENDING);
    }
}
