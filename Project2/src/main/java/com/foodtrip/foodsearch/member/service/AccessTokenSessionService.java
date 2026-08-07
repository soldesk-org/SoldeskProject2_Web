package com.foodtrip.foodsearch.member.service;

import java.time.Duration;

import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 발급된 access token을 "현재 유효한 세션"으로 Redis에 등록해두고, 로그아웃 시 그 기록을 지워서
 * 자연 만료(exp)보다 앞당겨 즉시 무효화한다. refresh token(RefreshTokenService)과 동일한 생애주기 패턴
 * (로그인 시 등록 → 로그아웃 시 삭제 → 또는 TTL로 자연 만료)이며, "블랙리스트"(무효화된 것만 모으는 목록)가 아니다.
 */
@Component
public class AccessTokenSessionService {

    private final StringRedisTemplate redisTemplate;

    public AccessTokenSessionService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void register(String jti, Long memberId, long ttlMillis) {
        redisTemplate.opsForValue().set(key(jti), String.valueOf(memberId), Duration.ofMillis(ttlMillis));
    }

    public void revoke(String jti) {
        redisTemplate.delete(key(jti));
    }

    // 회원정보수정(001-02(회원정보수정) 3장)처럼 Authorization 헤더로 로그인 상태를 확인해야 하는
    // 신규 보호 엔드포인트에서 사용한다. jti가 등록되어 있으면 아직 유효한(로그아웃되지 않은) 세션이다.
    //
    // 이 메서드는 인가 필터(JwtAuthenticationFilter)에서 사실상 모든 보호된 요청마다 호출되는데,
    // 원격 Redis(Azure VM)가 한동안 유휴 상태였다가 중간 네트워크 구간에서 커넥션이 끊긴 직후 요청이
    // 들어오면 "Connection reset"으로 실패하는 경우가 간헐적으로 있었다(2026-08-05 확인). Lettuce는
    // 끊긴 걸 감지하면 자동 재연결하므로, 실패 시 한 번만 짧게 재시도하면 대부분 바로 성공한다.
    public boolean isActive(String jti) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key(jti)));
        } catch (DataAccessException e) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw e;
            }
            return Boolean.TRUE.equals(redisTemplate.hasKey(key(jti)));
        }
    }

    private String key(String jti) {
        return "access:" + jti;
    }
}
