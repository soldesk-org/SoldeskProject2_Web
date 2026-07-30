package com.foodtrip.foodsearch.member.service;

import java.time.Duration;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * refresh token을 DB 테이블(refresh_tokens) 대신 Redis에 보관한다.
 * 1인 1세션을 가정하여 memberId 하나당 토큰 하나만 유지하며(재로그인/재발급 시 이전 토큰은 자동으로 교체됨),
 * TTL이 곧 만료 처리라 별도 정리 배치가 필요 없다.
 *
 * 로그인 상태 유지 체크박스(2026-07-19 요구사항 추가, 001-02(로그인) 참고) — TTL을 두 단계로 나눈다.
 * Redis 값에 "{token}:{tier}" 형식으로 tier(LONG/SHORT)를 함께 저장해, refresh()로 토큰을 회전(rotate)할
 * 때도 클라이언트가 rememberMe를 다시 보내지 않아도 최초 로그인 시 선택한 tier가 그대로 유지되게 한다.
 */
@Component
public class RefreshTokenService {

    private static final String TIER_LONG = "LONG";
    private static final String TIER_SHORT = "SHORT";
    private static final String SEPARATOR = ":";

    private final StringRedisTemplate redisTemplate;
    private final Duration longTtl;
    private final Duration shortTtl;

    public RefreshTokenService(StringRedisTemplate redisTemplate,
                                @Value("${jwt.refresh-expiration-days:14}") long refreshExpirationDays,
                                @Value("${jwt.refresh-expiration-hours-short:24}") long refreshExpirationHoursShort) {
        this.redisTemplate = redisTemplate;
        this.longTtl = Duration.ofDays(refreshExpirationDays);
        this.shortTtl = Duration.ofHours(refreshExpirationHoursShort);
    }

    public String issue(Long memberId, boolean rememberMe) {
        String token = UUID.randomUUID().toString();
        String tier = rememberMe ? TIER_LONG : TIER_SHORT;
        Duration ttl = rememberMe ? longTtl : shortTtl;
        redisTemplate.opsForValue().set(key(memberId), token + SEPARATOR + tier, ttl);
        return token;
    }

    public boolean matches(Long memberId, String token) {
        String storedToken = extractToken(redisTemplate.opsForValue().get(key(memberId)));
        return storedToken != null && storedToken.equals(token);
    }

    // 재발급(refresh) 시 회전 전 저장돼 있던 토큰의 tier를 읽어, 같은 tier로 재발급하기 위한 용도.
    public boolean isRememberMe(Long memberId) {
        String stored = redisTemplate.opsForValue().get(key(memberId));
        return stored != null && stored.endsWith(SEPARATOR + TIER_LONG);
    }

    public boolean exists(Long memberId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key(memberId)));
    }

    public void revoke(Long memberId) {
        redisTemplate.delete(key(memberId));
    }

    private String extractToken(String storedValue) {
        if (storedValue == null) {
            return null;
        }
        int idx = storedValue.lastIndexOf(SEPARATOR);
        return idx >= 0 ? storedValue.substring(0, idx) : storedValue;
    }

    private String key(Long memberId) {
        return "refresh:" + memberId;
    }
}
