package com.foodtrip.foodsearch.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.foodtrip.foodsearch.chat.security.ChatStompAuthInterceptor;

// 19(오픈채팅) — 실시간 채팅용 STOMP over WebSocket 설정. 엔드포인트는 /ws-chat 하나뿐(다른 기능이
// WebSocket을 쓸 일이 아직 없어 이 기능 전용으로만 등록 - CLAUDE.md 2장 "필요한 만큼만" 원칙).
// setAllowedOriginPatterns("*")는 이 프로젝트의 REST API들이 원래 CORS 제약 없이 정적 테스트 페이지에서
// 바로 호출되는 것과 같은 톤(팀 전체가 이 서버 하나를 공유해서 쓰는 개발 단계 특성상 브라우저 출처 제한을
// 걸지 않음).
@Configuration
@EnableWebSocketMessageBroker
public class ChatWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ChatStompAuthInterceptor chatStompAuthInterceptor;

    public ChatWebSocketConfig(ChatStompAuthInterceptor chatStompAuthInterceptor) {
        this.chatStompAuthInterceptor = chatStompAuthInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-chat").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // /topic: 방 전체 브로드캐스트(메시지, 방 폭파 알림), /queue: 특정 회원에게만(클린봇 거부 알림 등,
        // convertAndSendToUser가 내부적으로 /user/queue/... 로 라우팅).
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(chatStompAuthInterceptor);
    }
}
