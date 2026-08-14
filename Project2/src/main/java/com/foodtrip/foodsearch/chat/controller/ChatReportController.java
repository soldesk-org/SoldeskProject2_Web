package com.foodtrip.foodsearch.chat.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.chat.service.ChatReportService;
import com.foodtrip.foodsearch.report.dto.CreateReportRequestDto;

import jakarta.validation.Valid;

@RestController
public class ChatReportController {

    private final ChatReportService chatReportService;

    public ChatReportController(ChatReportService chatReportService) {
        this.chatReportService = chatReportService;
    }

    @PostMapping("/api/chat/rooms/{chatRoomId}/reports")
    public ChatActionResponseDto reportRoom(@RequestHeader("Authorization") String authorizationHeader,
                                             @PathVariable Long chatRoomId,
                                             @Valid @RequestBody CreateReportRequestDto request) {
        return chatReportService.reportRoom(authorizationHeader, chatRoomId, request);
    }

    @PostMapping("/api/chat/messages/{chatMessageId}/reports")
    public ChatActionResponseDto reportMessage(@RequestHeader("Authorization") String authorizationHeader,
                                                @PathVariable Long chatMessageId,
                                                @Valid @RequestBody CreateReportRequestDto request) {
        return chatReportService.reportMessage(authorizationHeader, chatMessageId, request);
    }
}
