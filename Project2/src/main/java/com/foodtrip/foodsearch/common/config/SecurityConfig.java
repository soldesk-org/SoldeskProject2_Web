package com.foodtrip.foodsearch.common.config;

import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.exception.ErrorResponse;
import com.foodtrip.foodsearch.common.security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
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

    // 14(관리자-권한) 도입 — /api/admin/** 경로에만 Spring Security의 역할(ROLE) 기반 접근 제어를 건다.
    // 그 외 모든 경로는 permitAll로 두어(=Spring Security 레벨에서는 통제하지 않음), 기존에 이미 동작하던
    // 회원가입/로그인/리뷰 등 API의 자체 인증(resolveMemberId 등)에 아무 영향을 주지 않는다 —
    // CLAUDE.md 2장의 "필요한 만큼만" 원칙을 이번에도 그대로 적용(전체 API를 한 번에 Security로 옮기지 않음).
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter,
                                                     ObjectMapper objectMapper) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
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
