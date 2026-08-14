package com.foodtrip.foodsearch.member.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.member.dto.BusinessSignUpRequestDto;
import com.foodtrip.foodsearch.member.dto.SignUpResponseDto;
import com.foodtrip.foodsearch.member.service.MemberService;

import jakarta.validation.Valid;

// REST 라우팅 전면 개편(2026-08-14) — 사업자 회원가입을 별도 리소스 컬렉션으로 분리
// (기존 POST /api/members/signup/business, multipart 요청 형태가 일반 가입과 달라서 별도 컨트롤러로 둠).
@RestController
@RequestMapping("/api/business-members")
public class BusinessMemberController {

    private final MemberService memberService;

    public BusinessMemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SignUpResponseDto signUpBusiness(@Valid @ModelAttribute BusinessSignUpRequestDto request,
                                             @RequestParam("businessLicenseFile") MultipartFile businessLicenseFile) {
        return memberService.signUpBusiness(request, businessLicenseFile);
    }
}
