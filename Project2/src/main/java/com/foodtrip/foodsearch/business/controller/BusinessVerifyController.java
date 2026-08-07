package com.foodtrip.foodsearch.business.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.business.client.BusinessVerificationClient;
import com.foodtrip.foodsearch.business.client.BusinessVerificationResult;
import com.foodtrip.foodsearch.business.dto.BusinessVerifyResponseDto;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

// 사업자 회원가입 STEP1(signup-business.html) 화면에서 최종 제출 전에 증명원을 미리 검증해볼 수 있도록
// 하는 공개 엔드포인트(2026-08-04 신규) — MemberServiceImpl.signUpBusiness()가 이미 같은
// BusinessVerificationClient를 호출하고 있어서, 여기서는 그 클라이언트를 그대로 재사용만 한다.
// 최종 가입 제출은 이 사전 검증 결과를 신뢰하지 않고 파일로 다시 독립적으로 검증한다.
@RestController
public class BusinessVerifyController {

    private final BusinessVerificationClient businessVerificationClient;

    public BusinessVerifyController(BusinessVerificationClient businessVerificationClient) {
        this.businessVerificationClient = businessVerificationClient;
    }

    @PostMapping("/api/business/verify-license")
    public BusinessVerifyResponseDto verifyLicense(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "사업자등록증명원 파일은 필수입니다.");
        }
        BusinessVerificationResult result = businessVerificationClient.verify(file);
        return new BusinessVerifyResponseDto(true, result.businessNumber(), result.companyName(),
                result.representativeName(), result.address(), result.openDate());
    }
}
