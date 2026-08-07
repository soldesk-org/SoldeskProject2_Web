package com.foodtrip.foodsearch.business.client;

/**
 * 사업자 인증(OCR + 원본확인 + 진위확인) Python 서버가 반환한 검증 완료 정보.
 */
public record BusinessVerificationResult(String businessNumber, String companyName, String representativeName,
                                          String address, String openDate) {
}
