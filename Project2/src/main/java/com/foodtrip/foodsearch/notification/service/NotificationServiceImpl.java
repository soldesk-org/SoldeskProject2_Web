package com.foodtrip.foodsearch.notification.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.notification.dto.NotificationResponseDto;
import com.foodtrip.foodsearch.notification.dto.NotificationUnreadCountResponseDto;
import com.foodtrip.foodsearch.notification.entity.Notification;
import com.foodtrip.foodsearch.notification.repository.NotificationRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 알림 벨(2026-08-06 추가) — eatty-ui.js가 이미 갖고 있던 "★ 서버 연동 지점" 스펙을 그대로 구현.
// 실시간 전달(2026-08-06 2차 추가)은 19(오픈채팅)이 이미 깔아둔 /ws-chat STOMP 브로커를 그대로 재사용한다
// (ChatStompAuthInterceptor가 CONNECT 시 Principal 이름을 memberId 문자열로 심어두므로,
// convertAndSendToUser(memberId, "/queue/notifications", ...)로 그 회원에게만 보낼 수 있다).
// 새 WebSocket 엔드포인트를 추가로 등록하지 않고 기존 걸 공유 — 페이지가 알림만을 위해서라도 이미 로그인
// 상태면 이 소켓에 붙어있어야 하므로, 채팅 페이지가 아니어도 연결하도록 프론트(api.js)에서 처리한다.
@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                    JwtProvider jwtProvider,
                                    AccessTokenSessionService accessTokenSessionService,
                                    SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public List<NotificationResponseDto> list(String authorizationHeader, String filter) {
        Long memberId = resolveMemberId(authorizationHeader);
        List<Notification> notifications = "unread".equals(filter)
                ? notificationRepository.findTop50ByMemberIdAndIsReadFalseOrderByCreatedAtDesc(memberId)
                : notificationRepository.findTop50ByMemberIdOrderByCreatedAtDesc(memberId);
        return notifications.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public NotificationUnreadCountResponseDto unreadCount(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        return new NotificationUnreadCountResponseDto(notificationRepository.countByMemberIdAndIsReadFalse(memberId));
    }

    @Override
    @Transactional
    public void markRead(Long notificationId, String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        Notification notification = notificationRepository.findByNotificationIdAndMemberId(notificationId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notification.markRead();
    }

    @Override
    @Transactional
    public void markAllRead(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        notificationRepository.markAllRead(memberId);
    }

    @Override
    @Transactional
    public void delete(Long notificationId, String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        Notification notification = notificationRepository.findByNotificationIdAndMemberId(notificationId, memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public void create(Long memberId, String type, String title, String body, String linkUrl) {
        Notification notification = notificationRepository.save(Notification.create(memberId, type, title, body, linkUrl));
        // 소켓에 붙어있지 않은 회원(로그아웃 상태 등)에게 보내도 convertAndSendToUser는 조용히 무시될 뿐
        // 예외를 던지지 않는다 — DB 저장은 이미 끝났으니 다음 로그인/새로고침 시 GET /api/notifications로도
        // 정상적으로 보인다(소켓은 "지금 붙어있으면 즉시", DB는 항상 남는 이중 경로).
        messagingTemplate.convertAndSendToUser(String.valueOf(memberId), "/queue/notifications", toDto(notification));
    }

    private NotificationResponseDto toDto(Notification n) {
        return new NotificationResponseDto(n.getNotificationId(), n.getType(), n.getTitle(), n.getBody(),
                n.getLinkUrl(), n.isRead(), n.getCreatedAt());
    }

    // 07/08/10 등 이 프로젝트가 계속 써온 resolveMemberId()와 동일한 로직 — 패키지가 달라 그대로 복제.
    private Long resolveMemberId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        Claims claims;
        try {
            claims = jwtProvider.parseClaims(accessToken);
        } catch (JwtException e) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        if (!accessTokenSessionService.isActive(claims.getId())) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        return Long.valueOf(claims.getSubject());
    }
}
