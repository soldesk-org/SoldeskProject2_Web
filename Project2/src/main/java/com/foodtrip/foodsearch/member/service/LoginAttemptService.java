package com.foodtrip.foodsearch.member.service;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 로그인 실패 카운트/계정 잠금을 Redis에 보관한다.
 * DB read-modify-write 방식은 동시 요청 시 증가분이 유실될 수 있어(lost update),
 * Redis의 원자적 INCR과 TTL 기반 잠금 만료로 대체했다.
 */
@Component
public class LoginAttemptService {

    static final int MAX_LOGIN_FAIL_COUNT = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(30);
    // 사용자가 끝까지 성공/재시도하지 않고 이탈한 경우 실패 카운트 키가 무한정 남지 않도록 안전장치로 TTL을 건다.
    private static final Duration FAIL_COUNT_SAFETY_TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;

    public LoginAttemptService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isLocked(Long memberId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(lockKey(memberId)));
    }

    public boolean recordFailureAndCheckLocked(Long memberId) {
        Long count = redisTemplate.opsForValue().increment(failKey(memberId));
        redisTemplate.expire(failKey(memberId), FAIL_COUNT_SAFETY_TTL);

        if (count != null && count >= MAX_LOGIN_FAIL_COUNT) {
            // setIfAbsent(SET NX): 이미 잠긴 상태에서 동시에 도착한 다른 실패 요청이 잠금 시간을 계속 연장하지 않도록 함.
            redisTemplate.opsForValue().setIfAbsent(lockKey(memberId), "1", LOCK_DURATION);
            return true;
        }
        return false;
    }

    public void resetFailCount(Long memberId) {
        redisTemplate.delete(failKey(memberId));
        redisTemplate.delete(lockKey(memberId));
    }

    private String failKey(Long memberId) {
        return "login:fail:" + memberId;
    }

    private String lockKey(Long memberId) {
        return "login:lock:" + memberId;
    }
}
