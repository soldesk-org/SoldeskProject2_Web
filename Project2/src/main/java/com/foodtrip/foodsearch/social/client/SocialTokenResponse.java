package com.foodtrip.foodsearch.social.client;

/**
 * 플랫폼 토큰 발급 API의 응답을 공통 형태로 정규화한 것. expiresInSeconds는 플랫폼이 안 주면 null일 수 있다.
 */
public record SocialTokenResponse(String accessToken, String refreshToken, Long expiresInSeconds) {
}
