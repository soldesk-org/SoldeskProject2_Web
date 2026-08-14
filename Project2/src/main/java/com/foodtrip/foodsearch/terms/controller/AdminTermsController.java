package com.foodtrip.foodsearch.terms.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.terms.dto.AdminNoticeResponseDto;
import com.foodtrip.foodsearch.terms.dto.CreateTermsVersionRequestDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionCreateResponseDto;
import com.foodtrip.foodsearch.terms.dto.TermsVersionSummaryResponseDto;
import com.foodtrip.foodsearch.terms.service.AdminTermsService;

import jakarta.validation.Valid;

// 14(관리자-권한)와 같은 방식으로 /api/admin/** 전체가 SecurityConfig에서 hasRole("ADMIN")으로 이미
// 막혀있으므로 이 컨트롤러에서 별도 인가 체크를 하지 않는다. AdminController에 몰아넣지 않고 별도
// 컨트롤러로 분리한 이유는 AdminController가 이미 여러 도메인(회원/리뷰/신고/채팅/공지발송)을 한 클래스에
// 모아두고 있어 더 커지는 걸 피하기 위함 — SecurityConfig 매칭은 경로 프리픽스 기준이라 클래스를 나눠도
// 접근 제어에는 영향이 없다.
@RestController
public class AdminTermsController {

    private final AdminTermsService adminTermsService;

    public AdminTermsController(AdminTermsService adminTermsService) {
        this.adminTermsService = adminTermsService;
    }

    // 새 버전 등록 + (이전 버전이 있으면) 변경 공지 게시를 한 번에 처리한다.
    @PostMapping("/api/admin/terms/{docType}/versions")
    public TermsVersionCreateResponseDto createVersion(@PathVariable String docType,
                                                          @Valid @RequestBody CreateTermsVersionRequestDto request) {
        return adminTermsService.createVersion(docType, request);
    }

    @GetMapping("/api/admin/terms/{docType}/versions")
    public List<TermsVersionSummaryResponseDto> listVersions(@PathVariable String docType) {
        return adminTermsService.listVersions(docType);
    }

    @GetMapping("/api/admin/notices")
    public List<AdminNoticeResponseDto> listNotices() {
        return adminTermsService.listNotices();
    }
}
