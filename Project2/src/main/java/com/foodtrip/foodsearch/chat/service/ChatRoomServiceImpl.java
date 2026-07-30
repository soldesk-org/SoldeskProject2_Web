package com.foodtrip.foodsearch.chat.service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatMessageResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatRoomResponseDto;
import com.foodtrip.foodsearch.chat.entity.ChatMessage;
import com.foodtrip.foodsearch.chat.entity.ChatRoom;
import com.foodtrip.foodsearch.chat.entity.ChatRoomMember;
import com.foodtrip.foodsearch.chat.repository.ChatMessageRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomMemberRepository;
import com.foodtrip.foodsearch.chat.repository.ChatRoomRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 19(오픈채팅) — 방 생성/참가/목록/나가기/폭파. 실시간 메시지 송수신 자체는 ChatMessageController(STOMP)가
// 맡고, 이 서비스는 REST로 노출되는 "방 관리" 액션만 담당한다(001-02 1장 아키텍처 참고).
@Service
public class ChatRoomServiceImpl implements ChatRoomService {

    private static final int MESSAGE_HISTORY_LIMIT = 50;

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final JoinCodeGenerator joinCodeGenerator;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public ChatRoomServiceImpl(ChatRoomRepository chatRoomRepository, ChatRoomMemberRepository chatRoomMemberRepository,
                                ChatMessageRepository chatMessageRepository, MemberRepository memberRepository,
                                JoinCodeGenerator joinCodeGenerator, SimpMessagingTemplate messagingTemplate,
                                JwtProvider jwtProvider, AccessTokenSessionService accessTokenSessionService) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.memberRepository = memberRepository;
        this.joinCodeGenerator = joinCodeGenerator;
        this.messagingTemplate = messagingTemplate;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    @Transactional
    public ChatRoomResponseDto createRoom(String authorizationHeader, String title, Integer maxMembers) {
        Long memberId = resolveMemberId(authorizationHeader);
        String joinCode = joinCodeGenerator.generateUnique();
        ChatRoom room = chatRoomRepository.save(ChatRoom.create(title, joinCode, memberId, maxMembers));
        chatRoomMemberRepository.save(ChatRoomMember.create(room.getChatRoomId(), memberId));
        return toDto(room, 1);
    }

    // 2026-07-24 4차 후속 - "최대 인원 5명" 요청으로 정원 체크 추가. 이미 활성 참가자인 경우(재입장/이미
    // 보고 있는 방을 다시 join 호출)는 새 자리를 차지하는 게 아니므로 정원 체크를 건너뛴다(001-02 2-13장).
    @Override
    @Transactional
    public ChatRoomResponseDto joinRoom(String authorizationHeader, String joinCode) {
        Long memberId = resolveMemberId(authorizationHeader);
        ChatRoom room = chatRoomRepository.findByJoinCode(joinCode)
                .filter(ChatRoom::isOpen)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));

        var existing = chatRoomMemberRepository.findByChatRoomIdAndMemberId(room.getChatRoomId(), memberId);
        boolean alreadyActive = existing.isPresent() && existing.get().isActive();
        if (!alreadyActive) {
            long activeCount = chatRoomMemberRepository.countByChatRoomIdAndLeftAtIsNull(room.getChatRoomId());
            if (activeCount >= room.getMaxMembers()) {
                throw new CustomException(ErrorCode.CHAT_ROOM_FULL);
            }
            existing.ifPresentOrElse(ChatRoomMember::rejoin,
                    () -> chatRoomMemberRepository.save(ChatRoomMember.create(room.getChatRoomId(), memberId)));
        }

        long memberCount = chatRoomMemberRepository.countByChatRoomIdAndLeftAtIsNull(room.getChatRoomId());
        return toDto(room, memberCount);
    }

    // 2026-07-24 후속 - 폭파(CLOSED)된 방은 목록에서 아예 안 보이게 해달라는 요청으로 필터 추가
    // (기존엔 "폭파됨" 배지를 달고 계속 남아있었음 - 이력 조회 목적이었으나 사용자가 원하지 않아 제거).
    @Override
    public List<ChatRoomResponseDto> listMyRooms(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        List<ChatRoomMember> memberships = chatRoomMemberRepository.findByMemberIdAndLeftAtIsNull(memberId);
        if (memberships.isEmpty()) {
            return List.of();
        }
        List<Long> roomIds = memberships.stream().map(ChatRoomMember::getChatRoomId).toList();
        List<ChatRoom> rooms = chatRoomRepository.findAllById(roomIds);
        return rooms.stream()
                .filter(ChatRoom::isOpen)
                .sorted(Comparator.comparing(ChatRoom::getCreatedAt).reversed())
                .map(room -> toDto(room, chatRoomMemberRepository.countByChatRoomIdAndLeftAtIsNull(room.getChatRoomId())))
                .toList();
    }

    @Override
    public List<ChatMessageResponseDto> getMessages(String authorizationHeader, Long chatRoomId) {
        Long memberId = resolveMemberId(authorizationHeader);
        requireActiveMember(chatRoomId, memberId);

        List<ChatMessage> messages = chatMessageRepository.findTop50ByChatRoomIdOrderByCreatedAtDesc(chatRoomId);
        Collections.reverse(messages); // 오래된 순으로 화면에 보여주기 위해 뒤집는다

        List<Long> senderIds = messages.stream().map(ChatMessage::getMemberId).distinct().toList();
        Map<Long, String> nicknameByMemberId = memberRepository.findAllById(senderIds).stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getNickname));

        return messages.stream()
                .map(m -> new ChatMessageResponseDto(m.getChatMessageId(), m.getChatRoomId(), m.getMemberId(),
                        nicknameByMemberId.get(m.getMemberId()), m.getContent(),
                        ChatMessageResponseDto.TYPE_MESSAGE, m.getCreatedAt()))
                .toList();
    }

    @Override
    @Transactional
    public ChatActionResponseDto leaveRoom(String authorizationHeader, Long chatRoomId) {
        Long memberId = resolveMemberId(authorizationHeader);
        ChatRoomMember membership = chatRoomMemberRepository.findByChatRoomIdAndMemberId(chatRoomId, memberId)
                .filter(ChatRoomMember::isActive)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_MEMBER));
        membership.leave();
        return new ChatActionResponseDto(true, "채팅방에서 나갔습니다.");
    }

    // 방장만 가능 - 방 상태를 CLOSED로 바꾸고 대화 내용(chat_messages)을 물리 삭제한 뒤, 아직 접속 중인
    // 클라이언트들에게 시스템 알림을 브로드캐스트한다(001-01 "채팅방 방 폭파" 요청사항, 001-02 2-4장).
    @Override
    @Transactional
    public ChatActionResponseDto explodeRoom(String authorizationHeader, Long chatRoomId) {
        Long memberId = resolveMemberId(authorizationHeader);
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .filter(ChatRoom::isOpen)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));
        if (!room.getHostMemberId().equals(memberId)) {
            throw new CustomException(ErrorCode.CHAT_ROOM_ACCESS_DENIED);
        }

        return doExplode(room, "방장이 채팅방을 폭파했습니다.");
    }

    @Override
    @Transactional
    public ChatActionResponseDto adminExplodeRoom(Long chatRoomId) {
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .filter(ChatRoom::isOpen)
                .orElseThrow(() -> new CustomException(ErrorCode.CHAT_ROOM_NOT_FOUND));
        return doExplode(room, "관리자에 의해 채팅방이 폭파되었습니다.");
    }

    private ChatActionResponseDto doExplode(ChatRoom room, String noticeText) {
        Long chatRoomId = room.getChatRoomId();
        room.explode();
        chatMessageRepository.deleteByChatRoomId(chatRoomId);
        // ROOM_CLOSED(2026-07-24 3차 후속) - 접속 중인 클라이언트는 이 브로드캐스트를 받으면 안내만 하는
        // 게 아니라 그 방에서 강제로 나가야 한다(001-02 2-12장).
        messagingTemplate.convertAndSend("/topic/rooms/" + chatRoomId,
                ChatMessageResponseDto.roomClosed(chatRoomId, noticeText));
        return new ChatActionResponseDto(true, "채팅방을 폭파했습니다.");
    }

    private void requireActiveMember(Long chatRoomId, Long memberId) {
        if (!chatRoomMemberRepository.existsByChatRoomIdAndMemberIdAndLeftAtIsNull(chatRoomId, memberId)) {
            throw new CustomException(ErrorCode.CHAT_ROOM_NOT_MEMBER);
        }
    }

    private ChatRoomResponseDto toDto(ChatRoom room, long memberCount) {
        String hostNickname = memberRepository.findById(room.getHostMemberId())
                .map(Member::getNickname)
                .orElse(null);
        return new ChatRoomResponseDto(room.getChatRoomId(), room.getTitle(), room.getJoinCode(),
                room.getHostMemberId(), hostNickname, memberCount, room.getMaxMembers(), room.getStatus(),
                room.getCreatedAt());
    }

    // 07/08/12/18 등과 동일하게 패키지가 달라 공유 유틸로 뽑지 않고 그대로 복제(CLAUDE.md 2장).
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
