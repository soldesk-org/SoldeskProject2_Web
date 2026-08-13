package com.foodtrip.foodsearch.chat.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.chat.dto.ChatMessageResponseDto;
import com.foodtrip.foodsearch.chat.entity.ChatMessage;
import com.foodtrip.foodsearch.chat.entity.ChatRoom;
import com.foodtrip.foodsearch.chat.entity.ChatRoomMember;
import com.foodtrip.foodsearch.chat.repository.ChatMessageRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomMemberRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.notification.entity.Notification;
import com.foodtrip.foodsearch.notification.service.NotificationService;
import com.foodtrip.foodsearch.reviewfilter.client.ReviewFilterClient;

// 19(오픈채팅) — 실시간 메시지 1건을 검증/저장한다. 17(리뷰-필터링)에서 이미 붙인 ReviewFilterClient(korcen
// 기반, fail-open)를 리뷰 도메인 밖인 채팅에도 그대로 재사용했다 - 텍스트 하나를 검사해서 bool을 돌려주는
// 범용 클라이언트라 패키지 이름(reviewfilter)과 무관하게 재사용 가능하다고 판단(001-02 2-6장).
@Service
public class ChatMessageServiceImpl implements ChatMessageService {

    private static final int MAX_CONTENT_LENGTH = 1000;

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final ReviewFilterClient reviewFilterClient;
    private final NotificationService notificationService;

    public ChatMessageServiceImpl(ChatRoomRepository chatRoomRepository,
                                   ChatRoomMemberRepository chatRoomMemberRepository,
                                   ChatMessageRepository chatMessageRepository, MemberRepository memberRepository,
                                   ReviewFilterClient reviewFilterClient, NotificationService notificationService) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.memberRepository = memberRepository;
        this.reviewFilterClient = reviewFilterClient;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public ChatMessageResponseDto sendMessage(Long memberId, Long chatRoomId, String content) {
        if (!StringUtils.hasText(content)) {
            throw new CustomException(ErrorCode.CHAT_MESSAGE_CONTENT_REQUIRED);
        }
        String trimmed = content.length() > MAX_CONTENT_LENGTH ? content.substring(0, MAX_CONTENT_LENGTH) : content;

        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .filter(ChatRoom::isOpen)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));

        if (!chatRoomMemberRepository.existsByChatRoomIdAndMemberIdAndLeftAtIsNull(chatRoomId, memberId)) {
            throw new CustomException(ErrorCode.CHAT_ROOM_NOT_MEMBER);
        }

        if (reviewFilterClient.containsProfanity(trimmed)) {
            throw new CustomException(ErrorCode.CHAT_MESSAGE_PROFANITY);
        }

        ChatMessage message = chatMessageRepository.save(ChatMessage.create(room.getChatRoomId(), memberId, trimmed));
        String nickname = memberRepository.findById(memberId).map(Member::getNickname).orElse(null);

        notifyOtherMembers(room, memberId, trimmed);

        return new ChatMessageResponseDto(message.getChatMessageId(), message.getChatRoomId(), memberId, nickname,
                message.getContent(), ChatMessageResponseDto.TYPE_MESSAGE, message.getCreatedAt());
    }

    // 오픈채팅 알림(2026-08-06 추가) — 방에 접속해 있지 않은 다른 참가자도 헤더 알림 벨로 새 메시지를
    // 확인할 수 있도록, 발신자를 제외한 활성 참가자 각각에게 알림 행을 하나씩 만든다. 알림 설정에서
    // "오픈채팅 메시지 알림"을 끈 회원에게는 만들지 않는다.
    private void notifyOtherMembers(ChatRoom room, Long senderId, String content) {
        List<ChatRoomMember> activeMembers = chatRoomMemberRepository
                .findByChatRoomIdAndLeftAtIsNullOrderByJoinedAtAsc(room.getChatRoomId());
        String preview = content.length() > 50 ? content.substring(0, 50) + "..." : content;
        // 2026-08-13 수정 — 제목이 "발신자 · 방제목"으로 붙어 나와서 알림창에서 방 이름을 바로 알아보기
        // 힘들었다("스타벅스신논현 · aaa" 처럼). 방 이름만 보여주고, 발신자는 미리보기(preview)에서
        // 이미 구분 가능하므로 제목에서는 뺀다. 클릭 시 그 방으로 바로 들어가도록 링크에 room 쿼리도 추가.
        String title = room.getTitle();
        String linkUrl = "chat.html?room=" + room.getChatRoomId();
        for (ChatRoomMember roomMember : activeMembers) {
            Long recipientId = roomMember.getMemberId();
            if (recipientId.equals(senderId)) {
                continue;
            }
            memberRepository.findById(recipientId)
                    .filter(Member::isNotifyChat)
                    .ifPresent(recipient -> notificationService.create(recipientId, Notification.TYPE_CHAT, title,
                            preview, linkUrl));
        }
    }
}
