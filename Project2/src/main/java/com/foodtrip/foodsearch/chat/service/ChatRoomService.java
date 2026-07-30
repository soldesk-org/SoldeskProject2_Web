package com.foodtrip.foodsearch.chat.service;

import java.util.List;

import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatMessageResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatRoomResponseDto;

public interface ChatRoomService {

    ChatRoomResponseDto createRoom(String authorizationHeader, String title, Integer maxMembers);

    ChatRoomResponseDto joinRoom(String authorizationHeader, String joinCode);

    List<ChatRoomResponseDto> listMyRooms(String authorizationHeader);

    List<ChatMessageResponseDto> getMessages(String authorizationHeader, Long chatRoomId);

    ChatActionResponseDto leaveRoom(String authorizationHeader, Long chatRoomId);

    ChatActionResponseDto explodeRoom(String authorizationHeader, Long chatRoomId);

    // 관리자 강제 폭파(방장 소유권 체크 없음) - AdminChatServiceImpl에서만 호출(14.관리자-권한과 같은 톤,
    // 컨트롤러 단에서 이미 ADMIN 권한이 확인된 뒤 호출되므로 이 메서드 자체엔 별도 인증이 없다).
    ChatActionResponseDto adminExplodeRoom(Long chatRoomId);
}
