package com.foodtrip.foodsearch.common.web;

import jakarta.servlet.http.HttpServletRequest;

// 전화번호 SMS 인증 일일 횟수 제한(PhoneSmsRateLimitService)에서 IP 기준으로 카운트하기 위해
// 2026-07-30 신규 작성. 리버스 프록시/로드밸런서를 거치는 배포 환경(Nginx 등)에서는
// request.getRemoteAddr()가 프록시 자신의 IP만 보여주므로 X-Forwarded-For를 우선 확인한다.
public final class ClientIpUtil {

    private ClientIpUtil() {
    }

    public static String resolve(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            // "client, proxy1, proxy2" 형태 — 가장 왼쪽(최초 클라이언트)만 사용
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
