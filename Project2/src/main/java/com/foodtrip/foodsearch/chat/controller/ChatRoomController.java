package com.foodtrip.foodsearch.chat.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatMessageResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatRoomMemberResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatRoomResponseDto;
import com.foodtrip.foodsearch.chat.dto.CreateChatRoomRequestDto;
import com.foodtrip.foodsearch.chat.dto.JoinChatRoomRequestDto;
import com.foodtrip.foodsearch.chat.service.ChatRoomService;

import jakarta.validation.Valid;

// 19(오픈채팅) — 방 생성/참가/목록/기록/나가기/폭파는 REST, 실시간 메시지 송수신은 별도 STOMP 엔드포인트
// (ChatMessageController, /app/rooms/{roomId}/send)로 분리했다(001-02 1장).
@RestController
@RequestMapping("/api/chat/rooms")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    public ChatRoomController(ChatRoomService chatRoomService) {
        this.chatRoomService = chatRoomService;
    }

    @PostMapping
    public ChatRoomResponseDto createRoom(@RequestHeader("Authorization") String authorizationHeader,
                                           @Valid @RequestBody CreateChatRoomRequestDto request) {
        return chatRoomService.createRoom(authorizationHeader, request.getTitle(), request.getMaxMembers());
    }

    // REST 라우팅 전면 개편(2026-08-14) — 참가를 "방 멤버십" 리소스 생성으로 모델링 (기존 POST /join).
    @PostMapping("/memberships")
    public ChatRoomResponseDto joinRoom(@RequestHeader("Authorization") String authorizationHeader,
                                         @Valid @RequestBody JoinChatRoomRequestDto request) {
        return chatRoomService.joinRoom(authorizationHeader, request.getJoinCode());
    }

    // 기존 GET /my → scope 쿼리 파라미터로 표현(기존 GET /api/chat/rooms/my).
    @GetMapping
    public List<ChatRoomResponseDto> listMyRooms(@RequestHeader("Authorization") String authorizationHeader,
                                                  @RequestParam(defaultValue = "mine") String scope) {
        return chatRoomService.listMyRooms(authorizationHeader);
    }

    @GetMapping("/{chatRoomId}/messages")
    public List<ChatMessageResponseDto> getMessages(@RequestHeader("Authorization") String authorizationHeader,
                                                      @PathVariable Long chatRoomId) {
        return chatRoomService.getMessages(authorizationHeader, chatRoomId);
    }

    @GetMapping("/{chatRoomId}/members")
    public List<ChatRoomMemberResponseDto> listMembers(@RequestHeader("Authorization") String authorizationHeader,
                                                         @PathVariable Long chatRoomId) {
        return chatRoomService.listMembers(authorizationHeader, chatRoomId);
    }

    @DeleteMapping("/{chatRoomId}/members/me")
    public ChatActionResponseDto leaveRoom(@RequestHeader("Authorization") String authorizationHeader,
                                            @PathVariable Long chatRoomId) {
        return chatRoomService.leaveRoom(authorizationHeader, chatRoomId);
    }

    // "채팅방 방 폭파" - 방장만 가능, DELETE가 의미적으로 맞아서 REST로는 DELETE 사용(001-01 참고).
    @DeleteMapping("/{chatRoomId}")
    public ChatActionResponseDto explodeRoom(@RequestHeader("Authorization") String authorizationHeader,
                                              @PathVariable Long chatRoomId) {
        return chatRoomService.explodeRoom(authorizationHeader, chatRoomId);
    }
}
