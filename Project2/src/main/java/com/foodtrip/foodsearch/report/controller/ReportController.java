package com.foodtrip.foodsearch.report.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.report.dto.CreateReportRequestDto;
import com.foodtrip.foodsearch.report.dto.ReportActionResponseDto;
import com.foodtrip.foodsearch.report.service.ReportService;

import jakarta.validation.Valid;

@RestController
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/api/reviews/{reviewId}/report")
    public ReportActionResponseDto reportReview(@PathVariable Long reviewId,
                                                 @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                 @Valid @RequestBody CreateReportRequestDto request) {
        return reportService.reportReview(reviewId, authorizationHeader, request);
    }
}
