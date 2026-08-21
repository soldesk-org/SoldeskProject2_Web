package com.foodtrip.foodsearch.common.config;

import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.exception.ErrorResponse;
import com.foodtrip.foodsearch.common.security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import java.io.IOException;

import tools.jackson.databind.ObjectMapper;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // saltLength=16, hashLength=32, parallelism=1, memory=65536KB, iterations=3
        return new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
    }

    /**
     * 정적 리소스(CSS/JS/이미지) 전용 체인 (2026-08-21 추가).
     *
     * Spring Security는 기본적으로 모든 응답에
     * {@code Cache-Control: no-cache, no-store, max-age=0, must-revalidate}를 붙인다(민감 정보가
     * 프록시/브라우저에 캐시되는 걸 막기 위한 안전한 기본값). 그런데 그게 정적 리소스에도 걸려서
     * <b>브라우저가 CSS/JS를 전혀 캐시하지 못하고 페이지를 옮길 때마다 다시 받고 있었다.</b>
     * eatty.css 하나가 130KB(gzip 35KB)라 매 이동마다 0.3~0.5초가 걸렸고, stylesheet는 렌더 블로킹이라
     * 그 시간 동안 화면이 비어 보였다 — iOS 앱에서 "페이지 넘어갈 때마다 0.5초쯤 흰 화면이 뜬다"고
     * 지적받은 현상의 실제 원인이다(응답 헤더와 전송량을 직접 측정해 확인).
     *
     * 그래서 이 경로들만 별도 체인으로 떼어내 Security의 캐시 금지 헤더를 끄고, 실제 캐시 기간은
     * application.yml의 {@code spring.web.resources.cache.cachecontrol}에서 준다. API 응답은 아래
     * 기본 체인이 그대로 처리하므로 no-store가 유지된다(토큰/개인정보가 캐시되지 않는다).
     *
     * 이 경로에는 인증이 필요한 리소스가 없다(공개 정적 파일뿐). 업로드된 사용자 이미지는 Azure Blob
     * (images.eattyway.com)에서 서빙되므로 여기 해당하지 않는다.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain staticResourcesFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/assets/**", "/img/**", "/js/**", "/favicon.ico", "/robots.txt", "/sitemap.xml")
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers.cacheControl(HeadersConfigurer.CacheControlConfig::disable))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }

    // 14(관리자-권한) 도입 — /api/admin/** 경로에만 Spring Security의 역할(ROLE) 기반 접근 제어를 건다.
    // 그 외 모든 경로는 permitAll로 두어(=Spring Security 레벨에서는 통제하지 않음), 기존에 이미 동작하던
    // 회원가입/로그인/리뷰 등 API의 자체 인증(resolveMemberId 등)에 아무 영향을 주지 않는다 —
    // CLAUDE.md 2장의 "필요한 만큼만" 원칙을 이번에도 그대로 적용(전체 API를 한 번에 Security로 옮기지 않음).
    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter,
                                                     ObjectMapper objectMapper) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                // 기본값(DENY)은 같은 출처(same-origin) iframe도 막아버려서, signup-info.html의
                // "음식 취향 찾기" 팝업이 taste-quiz.html을 iframe으로 띄우지 못하는 원인이 됐다(2026-08-04).
                // SAMEORIGIN으로 완화하되 다른 사이트에서의 클릭재킹 방지는 그대로 유지한다.
                .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().permitAll())
                .exceptionHandling(exception -> exception
                        // 미로그인 상태로 /api/admin/** 호출 → 401, 이 프로젝트의 다른 API와 같은 JSON 형식으로 응답
                        .authenticationEntryPoint((request, response, authException) ->
                                writeError(response, objectMapper, ErrorCode.NOT_LOGGED_IN))
                        // 로그인은 했지만 ADMIN이 아닌 회원이 호출 → 403
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                writeError(response, objectMapper, ErrorCode.ADMIN_ACCESS_DENIED)))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeError(jakarta.servlet.http.HttpServletResponse response, ObjectMapper objectMapper,
                             ErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                objectMapper.writeValueAsString(new ErrorResponse(errorCode.name(), errorCode.getDefaultMessage())));
    }
}
