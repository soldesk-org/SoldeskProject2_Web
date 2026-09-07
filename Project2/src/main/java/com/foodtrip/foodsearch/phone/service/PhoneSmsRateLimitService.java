package com.foodtrip.foodsearch.phone.service;

import java.time.Duration;
import java.time.LocalDate;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

/**
 * 전화번호 SMS 인증번호 발송을 IP 기준으로 하루 최대 횟수만 허용한다(2026-07-30 신규).
 * SMS 한 건마다 뿌리오(Ppurio) 발송 비용이 실제로 청구되므로, 악의적으로 같은 IP에서 반복
 * 요청해서 비용을 발생시키는 것을 막기 위함 — 회원가입/이메일찾기/회원정보수정 3곳의
 * SMS 발송 진입점이 전부 {@link PhoneAuthService#sendVerificationCode}를 거치므로
 * 그 안에서 이 서비스를 호출하는 것만으로 전부 커버된다.
 *
 * Redis 원자적 INCR + TTL 기반(LoginAttemptService와 같은 패턴) — 날짜를 키에 포함시켜서
 * 자정이 지나면 자연스럽게 새 카운트로 시작되도록 한다.
 */
@Component
public class PhoneSmsRateLimitService {

    static final int MAX_SMS_PER_IP_PER_DAY = 5;
    // 자정 직후 요청이 몰려도 카운트가 안전하게 남아있도록 하루보다 약간 긴 TTL을 건다.
    private static final Duration COUNT_TTL = Duration.ofHours(25);

    private final StringRedisTemplate redisTemplate;

    public PhoneSmsRateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 카운트를 1 증가시키고, 오늘 이미 한도를 초과했다면 예외를 던진다.
     * (한도를 넘겼는데도 계속 호출하면 카운트가 계속 늘어나지만, TTL이 있어 무한정 쌓이지는 않는다 —
     * 그리고 어차피 한도를 넘긴 이후의 모든 요청은 이 메서드에서 예외로 막혀 실제 SMS는 발송되지 않는다.)
     */
    public void checkAndRecord(String ip) {
        String key = countKey(ip);
        Long count = redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, COUNT_TTL);

        if (count != null && count > MAX_SMS_PER_IP_PER_DAY) {
            throw new CustomException(ErrorCode.PHONE_SMS_DAILY_LIMIT_EXCEEDED);
        }
    }

    /**
     * 실제 SMS 발송이 실패했을 때(뿌리오 쪽 시스템 오류 등, 이용자 귀책이 아닌 경우) checkAndRecord로
     * 올렸던 카운트를 되돌린다 — 2026-09-07 추가. 이게 없으면 우리 쪽/뿌리오 쪽 장애로 계속 실패하는
     * 상황에서도 카운트가 계속 쌓여서, 정작 이용자는 문자 한 통도 못 받았는데 "일일 한도 초과"로
     * 막히는 문제가 있었다(실제로 겪음).
     */
    public void release(String ip) {
        redisTemplate.opsForValue().decrement(countKey(ip));
    }

    private String countKey(String ip) {
        return "phone:sms:count:" + ip + ":" + LocalDate.now();
    }
}
