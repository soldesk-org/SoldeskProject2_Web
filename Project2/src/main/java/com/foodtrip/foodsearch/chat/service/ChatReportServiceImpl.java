package com.foodtrip.foodsearch.chat.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.chat.entity.ChatMessage;
import com.foodtrip.foodsearch.chat.entity.ChatReport;
import com.foodtrip.foodsearch.chat.entity.ChatRoom;
import com.foodtrip.foodsearch.chat.repository.ChatMessageRepository;
import com.foodtrip.foodsearch.chat.repository.ChatReportRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.report.dto.CreateReportRequestDto;
import com.foodtrip.foodsearch.report.service.ReportReasonCatalog;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 19(오픈채팅) — "그 채팅 또는 그 채팅방 둘 다 신고 가능하게"(사용자 요청) 두 가지 대상을 하나의
// ChatReport 엔티티(targetType으로 구분)로 처리한다. 16(리뷰-신고)의 ReportReasonCatalog/
// CreateReportRequestDto를 그대로 재사용 - 사유 목록을 채팅용으로 새로 만들 이유가 없다고 판단(001-02
// 2-3장).
@Service
public class ChatReportServiceImpl implements ChatReportService {

    private final ChatReportRepository chatReportRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public ChatReportServiceImpl(ChatReportRepository chatReportRepository, ChatRoomRepository chatRoomRepository,
                                  ChatMessageRepository chatMessageRepository, JwtProvider jwtProvider,
                                  AccessTokenSessionService accessTokenSessionService) {
        this.chatReportRepository = chatReportRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    @Transactional
    public ChatActionResponseDto reportRoom(String authorizationHeader, Long chatRoomId, CreateReportRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));

        if (!ReportReasonCatalog.isValid(request.getReasonCode())) {
            throw new CustomException(ErrorCode.REPORT_REASON_NOT_ALLOWED);
        }
        if (chatReportRepository.existsByReporterMemberIdAndChatRoomIdAndTargetTypeAndChatMessageIdIsNull(
                memberId, chatRoomId, ChatReport.TARGET_ROOM)) {
            throw new CustomException(ErrorCode.CHAT_ALREADY_REPORTED);
        }

        chatReportRepository.save(ChatReport.createRoomReport(room.getChatRoomId(), memberId,
                request.getReasonCode(), request.getDetail()));
        return new ChatActionResponseDto(true, "채팅방 신고가 접수되었습니다.");
    }

    @Override
    @Transactional
    public ChatActionResponseDto reportMessage(String authorizationHeader, Long chatMessageId, CreateReportRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        ChatMessage message = chatMessageRepository.findById(chatMessageId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));

        if (!ReportReasonCatalog.isValid(request.getReasonCode())) {
            throw new CustomException(ErrorCode.REPORT_REASON_NOT_ALLOWED);
        }
        if (chatReportRepository.existsByReporterMemberIdAndChatMessageId(memberId, chatMessageId)) {
            throw new CustomException(ErrorCode.CHAT_ALREADY_REPORTED);
        }

        chatReportRepository.save(ChatReport.createMessageReport(message.getChatRoomId(), chatMessageId, memberId,
                request.getReasonCode(), request.getDetail(), message.getContent()));
        return new ChatActionResponseDto(true, "메시지 신고가 접수되었습니다.");
    }

    private Long resolveMemberId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        try {
            Claims claims = jwtProvider.parseClaims(accessToken);
            if (!accessTokenSessionService.isActive(claims.getId())) {
                throw new CustomException(ErrorCode.NOT_LOGGED_IN);
            }
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
    }
}
