package com.foodtrip.foodsearch.chat.security;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 19(오픈채팅) — REST API는 Authorization 헤더를 각 서비스가 직접 파싱하는 resolveMemberId() 패턴을 써왔지만
// (CLAUDE.md 2장), WebSocket은 매 메시지가 아니라 최초 CONNECT 한 번만 인증하면 되므로 그 방식이 안 맞는다.
// STOMP CONNECT 프레임의 커스텀 헤더 "Authorization"(REST와 같은 "Bearer {accessToken}" 형식)을 검증해서
// 세션에 Principal(StompPrincipal, memberId)을 심어두면, 이후 @MessageMapping 메서드들은 Principal
// 파라미터로 memberId를 바로 받을 수 있다. 토큰이 없거나 무효하면 CONNECT 자체를 거부한다(REST의
// resolveMemberId가 예외를 던지는 것과 같은 "인증 안 되면 아예 막는다" 톤 - REST의 resolveMemberIdOrNull처럼
// "익명 허용"은 채팅에는 의미가 없어 없음).
@Component
public class ChatStompAuthInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public ChatStompAuthInterceptor(JwtProvider jwtProvider, AccessTokenSessionService accessTokenSessionService) {
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authorizationHeader = accessor.getFirstNativeHeader("Authorization");
            Long memberId = resolveMemberId(authorizationHeader);
            accessor.setUser(new StompPrincipal(String.valueOf(memberId)));
        }
        return message;
    }

    private Long resolveMemberId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new MessagingException("로그인이 필요합니다.");
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        try {
            Claims claims = jwtProvider.parseClaims(accessToken);
            if (!accessTokenSessionService.isActive(claims.getId())) {
                throw new MessagingException("로그인이 필요합니다.");
            }
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            throw new MessagingException("로그인이 필요합니다.");
        }
    }
}
