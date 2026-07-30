package com.foodtrip.foodsearch.chat.service;

import com.foodtrip.foodsearch.chat.dto.ChatMessageResponseDto;

public interface ChatMessageService {

    // CustomException(CHAT_ROOM_NOT_FOUND/CHAT_ROOM_NOT_MEMBER/CHAT_MESSAGE_CONTENT_REQUIRED/
    // CHAT_MESSAGE_PROFANITY)을 던질 수 있다 - 호출자(ChatMessageController)가 잡아서 보낸 사람에게만
    // 에러를 돌려준다(001-02 2-6장).
    ChatMessageResponseDto sendMessage(Long memberId, Long chatRoomId, String content);
}
