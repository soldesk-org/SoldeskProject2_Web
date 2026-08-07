package com.foodtrip.foodsearch.supportchat.service;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.supportchat.client.HyperClovaXClient;
import com.foodtrip.foodsearch.supportchat.dto.SupportChatResponseDto;

// 25(AI고객센터챗봇)
@Service
public class SupportChatService {

    private final HyperClovaXClient hyperClovaXClient;
    private final SupportChatRateLimitService rateLimitService;
    private final SupportChatLogService logService;

    public SupportChatService(HyperClovaXClient hyperClovaXClient,
                               SupportChatRateLimitService rateLimitService,
                               SupportChatLogService logService) {
        this.hyperClovaXClient = hyperClovaXClient;
        this.rateLimitService = rateLimitService;
        this.logService = logService;
    }

    public SupportChatResponseDto ask(String message, String sessionId, String clientIp) {
        rateLimitService.checkAndRecord(clientIp);
        String answer = hyperClovaXClient.ask(message);
        logService.logTurn(sessionId, message, answer);
        return new SupportChatResponseDto(true, answer);
    }

    // 2026-07-31 2차 추가 — 상담종료 버튼 클릭 또는 페이지 닫힘(navigator.sendBeacon)으로 호출됨.
    // 이 세션에 대한 이후 조회 API 자체가 없으므로(001-01 참고), 여기서는 감사 목적의 종료 로그만 남긴다.
    public void endSession(String sessionId, String reason) {
        logService.logSessionEnd(sessionId, reason);
    }
}
