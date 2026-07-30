package com.foodtrip.foodsearch.chat.controller;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.foodtrip.foodsearch.chat.dto.ChatErrorDto;
import com.foodtrip.foodsearch.chat.dto.SendChatMessageRequestDto;
import com.foodtrip.foodsearch.chat.service.ChatMessageService;
import com.foodtrip.foodsearch.common.exception.CustomException;

// 19(오픈채팅) — 실시간 메시지 송수신 전용 STOMP 컨트롤러. 클라이언트가 CONNECT 시(ChatStompAuthInterceptor)
// 인증을 이미 마쳤으므로, Principal.getName()이 곧 memberId다(REST의 resolveMemberId와 동일한 결과를
// 다른 방식으로 얻음). 성공하면 방 전체(/topic/rooms/{roomId})로 브로드캐스트하고, 실패(클린봇에 걸림/
// 방에 없음 등)하면 보낸 사람에게만(/user/queue/errors) 에러를 돌려준다 - REST의
// GlobalExceptionHandler와 달리 STOMP는 예외를 컨트롤러가 직접 잡아서 처리해야 한다(001-02 2-6장).
@Controller
public class ChatMessageController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageController(ChatMessageService chatMessageService, SimpMessagingTemplate messagingTemplate) {
        this.chatMessageService = chatMessageService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/rooms/{roomId}/send")
    public void send(@DestinationVariable Long roomId, SendChatMessageRequestDto request, Principal principal) {
        Long memberId = Long.valueOf(principal.getName());
        try {
            var response = chatMessageService.sendMessage(memberId, roomId, request.getContent());
            messagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);
        } catch (CustomException e) {
            messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors",
                    new ChatErrorDto(e.getErrorCode().name(), e.getMessage()));
        }
    }
}
