package com.foodtrip.foodsearch.supportchat.service;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.supportchat.client.HyperClovaXClient;
import com.foodtrip.foodsearch.supportchat.dto.SupportChatResponseDto;

// 25(AI고객센터챗봇)
@Service
public class SupportChatService {

    private final HyperClovaXClient hyperClovaXClient;
    private final SupportChatRateLimitService rateLimitService;

    public SupportChatService(HyperClovaXClient hyperClovaXClient, SupportChatRateLimitService rateLimitService) {
        this.hyperClovaXClient = hyperClovaXClient;
        this.rateLimitService = rateLimitService;
    }

    public SupportChatResponseDto ask(String message, String clientIp) {
        rateLimitService.checkAndRecord(clientIp);
        String answer = hyperClovaXClient.ask(message);
        return new SupportChatResponseDto(true, answer);
    }
}
