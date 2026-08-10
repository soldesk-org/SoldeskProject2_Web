package com.foodtrip.foodsearch.common.config;

import java.io.IOException;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// 보안 헤더(2026-08-10 추가) — SecurityConfig의 SecurityFilterChain은 API 요청(/api/**)에는 이미
// X-Frame-Options/X-Content-Type-Options를 자동으로 붙여주고 있었지만, static HTML 페이지(explore.html
// 등 정적 리소스로 서빙되는 화면)는 그 필터 체인을 안 타서 헤더가 하나도 안 붙고 있었다(보안 점검 중
// curl로 직접 확인). 클릭재킹 방어가 정작 필요한 건 iframe에 담길 수 있는 HTML 페이지 쪽이라, Spring
// Security와 무관하게 모든 요청에 적용되는 서블릿 필터로 별도 추가한다.
@Component
@Order(1)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        response.setHeader("X-Frame-Options", "SAMEORIGIN");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        // frame-ancestors만 지정 — script-src/style-src 등은 이 프로젝트가 인라인 스타일과 여러 외부
        // 스크립트(네이버 지도, 카카오, Tailwind CDN 등)를 광범위하게 써서 잘못 제한하면 사이트가 깨질
        // 위험이 커 이번 범위에서는 건드리지 않는다 — frame-ancestors는 X-Frame-Options와 같은 역할(클릭
        // 재킹 방지)만 하고 리소스 로딩에는 영향이 없어 안전하게 추가할 수 있다.
        response.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
        filterChain.doFilter(request, response);
    }
}
