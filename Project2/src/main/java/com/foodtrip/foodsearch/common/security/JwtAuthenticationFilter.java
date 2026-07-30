package com.foodtrip.foodsearch.common.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// 14(관리자-권한) 도입 전까지는 이 프로젝트에 Spring Security 필터 자체가 없었다(CLAUDE.md 2장 "필요할 때만
// 인가 인프라를 만든다" 원칙 — 각 서비스가 Authorization 헤더를 직접 파싱하는 resolveMemberId() 패턴을
// 개별적으로 복제해서 썼음). 관리자 전용 API에 역할(ROLE) 기반 접근 제어가 필요해지면서 그 원칙의 "다음
// 단계"로 Spring Security를 실제로 도입했다.
//
// 이 필터는 유효한 토큰이 있으면 SecurityContext에 인증 정보(권한 포함)를 채워 넣기만 하고, 토큰이
// 없거나 무효해도 요청을 막지 않는다(그대로 다음 필터로 통과) — 기존에 이미 동작하던 모든 API(회원가입,
// 로그인, 리뷰 등)의 자체 인증 로직(resolveMemberId 등)에는 영향을 주지 않기 위함이다. 실제 접근 제어는
// SecurityConfig의 authorizeHttpRequests에서 /api/admin/** 경로에만 걸려있다.
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public JwtAuthenticationFilter(JwtProvider jwtProvider, AccessTokenSessionService accessTokenSessionService) {
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String accessToken = authorizationHeader.substring("Bearer ".length());
            try {
                Claims claims = jwtProvider.parseClaims(accessToken);
                if (accessTokenSessionService.isActive(claims.getId())) {
                    String memberId = claims.getSubject();
                    String role = claims.get("role", String.class);
                    List<SimpleGrantedAuthority> authorities =
                            List.of(new SimpleGrantedAuthority("ROLE_" + role));
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(memberId, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException | IllegalArgumentException e) {
                // 토큰이 무효해도 요청 자체를 막지 않는다 — SecurityContext를 그냥 비워둔 채 다음 필터로
                // 넘기면, /api/admin/** 경로는 SecurityConfig가 인증 안 됨(401)으로 처리하고, 그 외
                // 일반 API는 원래대로 각자의 resolveMemberId()가 처리한다.
            }
        }
        filterChain.doFilter(request, response);
    }
}
