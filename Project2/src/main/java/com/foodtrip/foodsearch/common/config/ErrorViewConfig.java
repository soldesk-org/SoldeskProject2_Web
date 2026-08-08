package com.foodtrip.foodsearch.common.config;

import java.util.Map;

import org.springframework.boot.webmvc.autoconfigure.error.ErrorViewResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.ModelAndView;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

/**
 * static/error.html이 있으면 Spring Boot가 Whitelabel Error Page 대신 자동으로 써야 하는데,
 * 이 프로젝트에서는 그 자동 인식(ErrorMvcAutoConfiguration의 StaticView)이 동작하지 않아서
 * (2026-08-08 확인) ErrorViewResolver를 직접 등록해 같은 효과를 낸다. BasicErrorController가
 * HTML을 응답해야 한다고 판단했을 때만 이 리졸버가 호출되므로(JSON 응답 경로는 그대로 기존
 * 동작 유지) API 클라이언트(fetch 등, Accept: application/json)는 영향받지 않는다. 원래 요청
 * 경로가 "/api/"로 시작하면(HTML을 원하는 API 클라이언트가 실수로 걸린 경우) 이 페이지 대신
 * 기본 처리(null 반환 → 다음 리졸버/Whitelabel)에 맡긴다.
 */
@Configuration
public class ErrorViewConfig {

    @Bean
    public ErrorViewResolver eattyErrorViewResolver() {
        return (HttpServletRequest request, HttpStatus status, Map<String, Object> model) -> {
            Object originalUri = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
            if (originalUri instanceof String uri && uri.startsWith("/api/")) {
                return null;
            }
            return new ModelAndView("forward:/error.html", model, status);
        };
    }
}
