package com.foodtrip.foodsearch.common.config;

import java.time.Duration;

import org.springframework.boot.data.redis.autoconfigure.LettuceClientOptionsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.lettuce.core.SocketOptions;

/**
 * Redis(Azure VM 도커 컨테이너, 원격)에 TCP keepalive 없이 붙어있으면, 한동안 요청이 없을 때
 * 중간 라우터/NAT/방화벽이 유휴 커넥션을 조용히 끊어버리고 서버는 그걸 모른 채 다음 명령을 보냈다가
 * "Connection reset"으로 실패하는 경우가 있다(2026-08-05, JwtAuthenticationFilter →
 * AccessTokenSessionService.isActive()에서 간헐적으로 재현됨). TCP keepalive를 켜서 OS 레벨에서
 * 주기적으로 살아있는지 확인하게 하면, 끊긴 연결을 미리 감지해 재연결하므로 이 문제가 줄어든다.
 * Spring Boot 4에서 Lettuce 자동설정 커스터마이저 패키지가
 * org.springframework.boot.data.redis.autoconfigure로 이동했다(13.HTTPS/14.관리자-권한 때와 같은 종류의
 * Boot 4 패키지 이동 이슈).
 */
@Configuration
public class RedisClientConfig {

    @Bean
    public LettuceClientOptionsBuilderCustomizer redisKeepAliveCustomizer() {
        return clientOptionsBuilder -> clientOptionsBuilder
                .socketOptions(SocketOptions.builder()
                        .keepAlive(true)
                        .connectTimeout(Duration.ofSeconds(5))
                        .build())
                .autoReconnect(true);
    }
}
