package com.foodtrip.foodsearch.business.dto;

/**
 * 사업자등록증명원 OCR+원본확인+진위확인 결과(2026-08-04 신규) — 회원가입 제출 전 미리보기용.
 * 실제 회원가입 최종 제출(POST /api/members/signup/business)은 이 응답을 신뢰하지 않고 파일로
 * 다시 한 번 독립적으로 검증한다(클라이언트가 이 결과를 조작해 보내도 최종 가입 단계에서 걸러짐).
 */
public record BusinessVerifyResponseDto(boolean success, String businessNumber, String companyName,
                                         String representativeName, String address, String openDate) {
}
