package com.foodtrip.foodsearch.report.service;

import java.util.List;

// 10.리뷰의 ReviewKeywordCatalog와 같은 패턴 — 고정 목록이 백엔드 검증의 유일한 출처.
public final class ReportReasonCatalog {

    public static final List<String> REASONS = List.of(
            "SPAM",          // 광고/도배성 내용
            "ABUSE",         // 욕설/비방
            "FALSE_INFO",    // 허위 사실
            "PRIVACY",       // 개인정보 노출
            "ETC"            // 기타(detail에 자유 텍스트)
    );

    private ReportReasonCatalog() {
    }

    public static boolean isValid(String reasonCode) {
        return reasonCode != null && REASONS.contains(reasonCode);
    }
}
