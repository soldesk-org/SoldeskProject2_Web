package com.foodtrip.foodsearch.social.client;

/**
 * 플랫폼 사용자 정보 조회 API의 응답을 공통 형태로 정규화한 것(001-02(소셜로그인) 2-2-4장).
 * phone은 네이버만 내려주므로 카카오/구글은 항상 null이다(2-3-3장).
 * profileImageUrl은 세 플랫폼 모두 제공하나(구글은 사실상 항상 값이 옴), 값이 없으면 null일 수 있다.
 */
public record SocialUserProfile(String providerUserId, String email, String nickname, String phone,
                                 String profileImageUrl) {
}
