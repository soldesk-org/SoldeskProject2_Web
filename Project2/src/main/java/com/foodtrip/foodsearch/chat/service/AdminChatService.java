package com.foodtrip.foodsearch.chat.service;

import java.util.List;

import com.foodtrip.foodsearch.chat.dto.AdminChatReportResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;

public interface AdminChatService {

    List<AdminChatReportResponseDto> listChatReports(String status);

    ChatActionResponseDto resolveReport(Long chatReportId);

    ChatActionResponseDto rejectReport(Long chatReportId);

    ChatActionResponseDto deleteMessage(Long chatMessageId);

    ChatActionResponseDto explodeRoom(Long chatRoomId);
}
