package com.foodtrip.foodsearch.supportchat.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.common.web.ClientIpUtil;
import com.foodtrip.foodsearch.supportchat.dto.AskSupportChatRequestDto;
import com.foodtrip.foodsearch.supportchat.dto.EndSupportChatRequestDto;
import com.foodtrip.foodsearch.supportchat.dto.SupportChatResponseDto;
import com.foodtrip.foodsearch.supportchat.service.SupportChatService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

// 25(AI고객센터챗봇) — 로그인 여부와 무관하게 누구나 문의할 수 있는 고객센터 성격이라 인증 불필요.
@RestController
@RequestMapping("/api/support-chat")
public class SupportChatController {

    private final SupportChatService supportChatService;

    public SupportChatController(SupportChatService supportChatService) {
        this.supportChatService = supportChatService;
    }

    @PostMapping("/messages")
    public SupportChatResponseDto ask(@Valid @RequestBody AskSupportChatRequestDto request,
                                       HttpServletRequest httpRequest) {
        return supportChatService.ask(request.getMessage(), request.getSessionId(), ClientIpUtil.resolve(httpRequest));
    }

    // 2026-07-31 2차 추가 — 상담종료 버튼 클릭, 또는 페이지 닫힘 시 navigator.sendBeacon으로 호출됨.
    // sendBeacon은 응답 본문을 읽지 않으므로 반환값은 의미 없지만, 명시적으로 200을 준다.
    // sendBeacon()은 항상 POST만 보낼 수 있어(DELETE 불가) HTTP 메서드는 그대로 두고 경로만 명사로 변경.
    @PostMapping("/session-terminations")
    public void end(@Valid @RequestBody EndSupportChatRequestDto request) {
        supportChatService.endSession(request.getSessionId(), request.getReason());
    }
}
