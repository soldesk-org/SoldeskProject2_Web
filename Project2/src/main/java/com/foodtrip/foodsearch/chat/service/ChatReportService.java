package com.foodtrip.foodsearch.chat.service;

import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.report.dto.CreateReportRequestDto;

public interface ChatReportService {

    ChatActionResponseDto reportRoom(String authorizationHeader, Long chatRoomId, CreateReportRequestDto request);

    ChatActionResponseDto reportMessage(String authorizationHeader, Long chatMessageId, CreateReportRequestDto request);
}
