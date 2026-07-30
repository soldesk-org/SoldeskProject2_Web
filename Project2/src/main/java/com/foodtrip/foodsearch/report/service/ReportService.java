package com.foodtrip.foodsearch.report.service;

import com.foodtrip.foodsearch.report.dto.CreateReportRequestDto;
import com.foodtrip.foodsearch.report.dto.ReportActionResponseDto;

public interface ReportService {

    ReportActionResponseDto reportReview(Long reviewId, String authorizationHeader, CreateReportRequestDto request);
}
