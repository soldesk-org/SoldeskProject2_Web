package com.foodtrip.foodsearch.supportchat.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.common.web.ClientIpUtil;
import com.foodtrip.foodsearch.supportchat.dto.AskSupportChatRequestDto;
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

    @PostMapping("/ask")
    public SupportChatResponseDto ask(@Valid @RequestBody AskSupportChatRequestDto request,
                                       HttpServletRequest httpRequest) {
        return supportChatService.ask(request.getMessage(), ClientIpUtil.resolve(httpRequest));
    }
}
