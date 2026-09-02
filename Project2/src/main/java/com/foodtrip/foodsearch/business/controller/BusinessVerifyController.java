package com.foodtrip.foodsearch.business.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.business.client.BusinessVerificationClient;
import com.foodtrip.foodsearch.business.client.BusinessVerificationResult;
import com.foodtrip.foodsearch.business.dto.BusinessVerifyResponseDto;
import com.foodtrip.foodsearch.business.repository.BusinessProfileRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

// 사업자 회원가입 STEP1(signup-business.html) 화면에서 최종 제출 전에 증명원을 미리 검증해볼 수 있도록
// 하는 공개 엔드포인트(2026-08-04 신규) — MemberServiceImpl.signUpBusiness()가 이미 같은
// BusinessVerificationClient를 호출하고 있어서, 여기서는 그 클라이언트를 그대로 재사용만 한다.
// 최종 가입 제출은 이 사전 검증 결과를 신뢰하지 않고 파일로 다시 독립적으로 검증한다.
@RestController
public class BusinessVerifyController {

    private final BusinessVerificationClient businessVerificationClient;
    private final BusinessProfileRepository businessProfileRepository;

    public BusinessVerifyController(BusinessVerificationClient businessVerificationClient,
                                     BusinessProfileRepository businessProfileRepository) {
        this.businessVerificationClient = businessVerificationClient;
        this.businessProfileRepository = businessProfileRepository;
    }

    @PostMapping("/api/business-license-verifications")
    public BusinessVerifyResponseDto verifyLicense(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "사업자등록증명원 파일은 필수입니다.");
        }
        BusinessVerificationResult result = businessVerificationClient.verify(file);
        // 2026-08-13 추가 — 이전엔 이 중복 확인을 STEP1 최종 제출(이메일/비밀번호 등 나머지 항목을 다
        // 채운 뒤) 시점에만 해서, 이미 등록된 사업자번호인지 모른 채 나머지 입력을 다 채운 다음에야 알게
        // 됐다. OCR 인식 직후 바로 알려주도록 여기서도 같은 검증을 한다(최종 제출 시 검증은 그대로 유지
        // 되므로 이중 방어).
        if (businessProfileRepository.existsByBusinessRegistrationNumber(result.businessNumber())) {
            throw new CustomException(ErrorCode.DUPLICATE_BUSINESS_NUMBER);
        }
        return new BusinessVerifyResponseDto(true, result.businessNumber(), result.companyName(),
                result.representativeName(), result.address(), result.openDate());
    }

    // 2026-08-22 추가 — 증명원 업로드 전에 사업자등록번호만으로 "등록된 번호가 맞는지 + 폐업하지
    // 않았는지"를 즉시 확인하는 가벼운 사전 확인. 화면의 "진위확인" 버튼이 지금까지는 증명원 업로드
    // 없이는 아예 호출이 안 됐던 문제("입력을 해도 증명원을 올려야 진위확인이 된다" 지적)를 해결한다.
    // 이름/개업일까지 대조하는 완전한 진위확인은 여전히 증명원 업로드(verifyLicense) 쪽에서 이뤄진다.
    @PostMapping("/api/business-number-status")
    public Map<String, Object> checkBusinessNumberStatus(@RequestBody Map<String, String> body) {
        String businessNumber = body.get("businessNumber");
        if (businessNumber == null || businessNumber.replace("-", "").length() != 10) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "사업자등록번호 10자리를 정확히 입력해주세요.");
        }
        String status = businessVerificationClient.checkNumberStatus(businessNumber.replace("-", ""));
        return Map.of("valid", true, "businessStatus", status);
    }
}
