package com.foodtrip.foodsearch.page.controller;

import java.io.IOException;
import java.util.Set;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import jakarta.servlet.http.HttpServletResponse;

// 프론트엔드 페이지(정적 HTML)를 확장자 없는 URL(예: /mypage)로도 접근 가능하게 해주는 라우팅.
// 실제 파일은 static/{page}.html 그대로이고, 여기서는 화이트리스트에 있는 이름만 그 파일로 forward한다.
// "/api/**", "/oauth/**"는 경로 형태(슬래시 포함)가 달라 애초에 안 겹치지만, "/ws-chat"(STOMP 핸드셰이크)는
// 이 패턴과 똑같이 점(.) 없는 단일 경로 조각이라 실제로 겹쳐서 404로 가로채는 회귀가 있었다(실 브라우저
// WebSocket 채팅 테스트로 발견) — 정규식에서 "ws-chat"만 명시적으로 제외한다.
@Controller
public class PageRoutingController {

    private static final Set<String> PAGES = Set.of(
            "index", "login", "login-business",
            "signup", "signup-info", "signup-done",
            "signup-business", "signup-business-info", "signup-business-done",
            "find-email", "find-email-verify", "find-email-result",
            "find-password", "find-password-sent", "find-password-reset", "find-password-done",
            "terms-service", "terms-privacy",
            "explore", "recommend", "taste-quiz", "receipt-upload",
            "mypage", "mypage-edit", "mypage-reviews", "chat", "business-mypage", "admin",
            "support", "admin-test"
    );

    @GetMapping("/")
    public String root() {
        return "forward:/index.html";
    }

    // GlobalExceptionHandler의 Exception catch-all이 ResponseStatusException까지 500으로 바꿔버리므로,
    // 화이트리스트에 없는 경로는 예외를 던지지 않고 직접 404 응답을 내려준다.
    @GetMapping("/{page:(?!ws-chat$)[a-z0-9-]+}")
    public String page(@PathVariable String page, HttpServletResponse response) throws IOException {
        if (!PAGES.contains(page)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return null;
        }
        return "forward:/" + page + ".html";
    }
}
