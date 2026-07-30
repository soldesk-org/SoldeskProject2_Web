package com.foodtrip.foodsearch.chat.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.chat.dto.ChatMessageResponseDto;
import com.foodtrip.foodsearch.chat.entity.ChatMessage;
import com.foodtrip.foodsearch.chat.entity.ChatRoom;
import com.foodtrip.foodsearch.chat.repository.ChatMessageRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomMemberRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
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

    public ChatMessageServiceImpl(ChatRoomRepository chatRoomRepository,
                                   ChatRoomMemberRepository chatRoomMemberRepository,
                                   ChatMessageRepository chatMessageRepository, MemberRepository memberRepository,
                                   ReviewFilterClient reviewFilterClient) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.memberRepository = memberRepository;
        this.reviewFilterClient = reviewFilterClient;
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

        return new ChatMessageResponseDto(message.getChatMessageId(), message.getChatRoomId(), memberId, nickname,
                message.getContent(), ChatMessageResponseDto.TYPE_MESSAGE, message.getCreatedAt());
    }
}
