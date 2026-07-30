package com.foodtrip.foodsearch.report.service;

import java.util.List;

import com.foodtrip.foodsearch.report.dto.AdminReportedReviewResponseDto;
import com.foodtrip.foodsearch.report.dto.ReportActionResponseDto;

public interface AdminReportService {

    // status가 null/blank면 PENDING(기본, "지금 확인해야 할 신고")으로 조회한다(2026-07-23 2차 추가).
    List<AdminReportedReviewResponseDto> listReportedReviews(String status);

    ReportActionResponseDto resolve(Long reviewId);

    // 처리 불가/반려(2026-07-23 2차 추가) - 신고를 검토했지만 조치할 필요가 없다고 판단한 경우.
    ReportActionResponseDto reject(Long reviewId);

    long countPendingReportedReviews();
}
