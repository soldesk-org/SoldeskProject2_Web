package com.foodtrip.foodsearch.member.service;

import java.time.Duration;

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
    public boolean isActive(String jti) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key(jti)));
    }

    private String key(String jti) {
        return "access:" + jti;
    }
}
