package com.foodtrip.foodsearch.appversion.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * iOS 앱의 "지금까지 서버가 본 최대 빌드 번호"를 Redis에 기록한다(2026-08-26 신규).
 *
 * 배경: EattyWay iOS 앱은 eattyway.com을 웹뷰로 띄우는 껍데기라 웹은 배포로 즉시 반영되지만,
 * 네이티브(로그인 브릿지/공유/스플래시/연결감지 등)는 재빌드+재설치가 필요하다. 오래된 네이티브
 * 빌드를 쓰는 사용자에게 업데이트를 안내하려면 "최신 빌드가 무엇인지"를 어딘가 알아야 한다.
 *
 * 마케팅 버전이나 웹 상수를 매번 손으로 올리는 대신, 앱이 실행될 때 자기 빌드 번호(CFBundleVersion)를
 * 서버에 보고하고, 서버는 그 최댓값을 기록한다. 새 빌드를 처음 설치한 사람(보통 개발자)이 실행하면
 * 서버 최댓값이 올라가고, 그 뒤 구버전 앱들은 자기 빌드가 최댓값보다 낮으므로 업데이트 안내를 받는다.
 * → 버전도 웹 상수도 손대지 않아도 "새 빌드가 있으면 자동으로" 안내된다.
 */
@Component
public class AppVersionService {

    private static final String LATEST_BUILD_KEY = "app:ios:latestBuild";

    private final StringRedisTemplate redisTemplate;

    public AppVersionService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** 앱이 보고한 빌드 번호를 반영(최댓값 갱신)하고, 갱신 후의 최신 빌드 번호를 돌려준다. */
    public long reportAndGetLatest(long reportedBuild) {
        long latest = getLatest();
        if (reportedBuild > latest) {
            // 동시성으로 아주 드물게 경합이 있을 수 있으나, 최댓값은 멱등에 가깝고 빌드 번호는
            // 단조 증가라 실질적 문제가 없다(잠깐 뒤 보고에서 다시 최댓값으로 수렴).
            redisTemplate.opsForValue().set(LATEST_BUILD_KEY, String.valueOf(reportedBuild));
            return reportedBuild;
        }
        return latest;
    }

    /** 현재 기록된 최신 빌드 번호. 아직 아무 보고도 없었다면 0. */
    public long getLatest() {
        String value = redisTemplate.opsForValue().get(LATEST_BUILD_KEY);
        if (value == null) {
            return 0L;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
