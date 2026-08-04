package com.foodtrip.foodsearch.supportchat.service;

import java.time.Duration;
import java.time.LocalDate;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

/**
 * AI 고객센터 챗봇 문의를 IP 기준으로 하루 최대 횟수만 허용한다(2026-07-31 신규).
 * HyperCLOVA X 호출도 SMS 발송처럼 건당 실제 비용이 청구되고, 이 API는 로그인 없이도 접근 가능하게
 * 설계되어 있어서(고객센터 성격상 비로그인 방문자도 문의할 수 있어야 함) 24(전화번호인증-속도제한)와
 * 같은 Redis 기반 IP당 일일 한도 패턴을 그대로 재사용했다.
 */
@Component
public class SupportChatRateLimitService {

    static final int MAX_QUESTIONS_PER_IP_PER_DAY = 30;
    private static final Duration COUNT_TTL = Duration.ofHours(25);

    private final StringRedisTemplate redisTemplate;

    public SupportChatRateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void checkAndRecord(String ip) {
        String key = countKey(ip);
        Long count = redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, COUNT_TTL);

        if (count != null && count > MAX_QUESTIONS_PER_IP_PER_DAY) {
            throw new CustomException(ErrorCode.SUPPORT_CHAT_DAILY_LIMIT_EXCEEDED);
        }
    }

    private String countKey(String ip) {
        return "support-chat:count:" + ip + ":" + LocalDate.now();
    }
}
