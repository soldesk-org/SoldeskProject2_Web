package com.foodtrip.foodsearch.chat.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.chat.dto.AdminChatReportResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatMessageResponseDto;
import com.foodtrip.foodsearch.chat.entity.ChatMessage;
import com.foodtrip.foodsearch.chat.entity.ChatReport;
import com.foodtrip.foodsearch.chat.entity.ChatRoom;
import com.foodtrip.foodsearch.chat.repository.ChatMessageRepository;
import com.foodtrip.foodsearch.chat.repository.ChatReportRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;

// 19(오픈채팅) — "관리자 페이지에서도 그 신고 리스트에 저거들도 들어가게 나눠놔야" 요청으로, 16(리뷰-신고)의
// 관리자 신고 관리와 같은 자리(신고 관리 영역)에 채팅 신고를 별도 목록으로 추가한다. 리뷰 신고와 데이터
// 모델이 달라(대상이 방/메시지 두 종류) 완전히 같은 서비스로 합치지 않고 별도 서비스로 분리했지만,
// AdminController에서 두 서비스를 나란히 주입받아 "신고 관리" 화면 하나에서 같이 노출한다.
@Service
public class AdminChatServiceImpl implements AdminChatService {

    private final ChatReportRepository chatReportRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final ChatRoomService chatRoomService;
    private final SimpMessagingTemplate messagingTemplate;

    public AdminChatServiceImpl(ChatReportRepository chatReportRepository, ChatRoomRepository chatRoomRepository,
                                 ChatMessageRepository chatMessageRepository, MemberRepository memberRepository,
                                 ChatRoomService chatRoomService, SimpMessagingTemplate messagingTemplate) {
        this.chatReportRepository = chatReportRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.memberRepository = memberRepository;
        this.chatRoomService = chatRoomService;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public List<AdminChatReportResponseDto> listChatReports(String status) {
        String targetStatus = StringUtils.hasText(status) ? status : ChatReport.STATUS_PENDING;
        List<ChatReport> reports = chatReportRepository.findByStatusOrderByCreatedAtDesc(targetStatus);
        if (reports.isEmpty()) {
            return List.of();
        }

        List<Long> roomIds = reports.stream().map(ChatReport::getChatRoomId).distinct().toList();
        Map<Long, String> roomTitleById = chatRoomRepository.findAllById(roomIds).stream()
                .collect(Collectors.toMap(ChatRoom::getChatRoomId, ChatRoom::getTitle));

        List<Long> reporterIds = reports.stream().map(ChatReport::getReporterMemberId).distinct().toList();
        Map<Long, String> nicknameById = memberRepository.findAllById(reporterIds).stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getNickname));

        return reports.stream()
                .map(r -> new AdminChatReportResponseDto(r.getChatReportId(), r.getTargetType(), r.getChatRoomId(),
                        roomTitleById.get(r.getChatRoomId()), r.getChatMessageId(),
                        nicknameById.get(r.getReporterMemberId()), r.getReasonCode(), r.getDetail(),
                        r.getReportedContentSnapshot(), r.getStatus(), r.getCreatedAt()))
                .toList();
    }

    @Override
    @Transactional
    public ChatActionResponseDto resolveReport(Long chatReportId) {
        ChatReport report = chatReportRepository.findById(chatReportId)
                .filter(r -> ChatReport.STATUS_PENDING.equals(r.getStatus()))
                .orElseThrow(() -> new CustomException(ErrorCode.REPORT_NOT_FOUND));
        report.resolve();
        return new ChatActionResponseDto(true, "신고 처리를 완료했습니다.");
    }

    @Override
    @Transactional
    public ChatActionResponseDto rejectReport(Long chatReportId) {
        ChatReport report = chatReportRepository.findById(chatReportId)
                .filter(r -> ChatReport.STATUS_PENDING.equals(r.getStatus()))
                .orElseThrow(() -> new CustomException(ErrorCode.REPORT_NOT_FOUND));
        report.reject();
        return new ChatActionResponseDto(true, "신고를 반려(처리 불가)했습니다.");
    }

    // 신고 처리(resolveReport)와 실제 삭제는 별개 액션 - 16(리뷰-신고)과 같은 원칙. 관리자가 신고된 메시지를
    // 실제로 지우고 싶으면 이 API를 별도로 호출해야 한다. 삭제 후 그 방을 보고 있는 다른 클라이언트들에게도
    // 실시간으로 알려야 하므로(사용자 요청 - "관리자 페이지에서 삭제하면 실시간 소켓으로도 삭제되어야"),
    // DB에서 지우는 것에 그치지 않고 /topic/rooms/{roomId}에 DELETED 이벤트를 브로드캐스트한다(001-02
    // 2-11장) - ChatMessage.explode()의 시스템 메시지 브로드캐스트와 같은 패턴.
    @Override
    @Transactional
    public ChatActionResponseDto deleteMessage(Long chatMessageId) {
        ChatMessage message = chatMessageRepository.findById(chatMessageId)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_MESSAGE_NOT_FOUND));
        Long chatRoomId = message.getChatRoomId();
        chatMessageRepository.deleteById(chatMessageId);
        messagingTemplate.convertAndSend("/topic/rooms/" + chatRoomId,
                ChatMessageResponseDto.deleted(chatRoomId, chatMessageId));
        return new ChatActionResponseDto(true, "메시지를 삭제했습니다.");
    }

    @Override
    @Transactional
    public ChatActionResponseDto explodeRoom(Long chatRoomId) {
        return chatRoomService.adminExplodeRoom(chatRoomId);
    }
}
