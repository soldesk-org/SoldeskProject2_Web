package com.foodtrip.foodsearch.social.client;

/**
 * 플랫폼 사용자 정보 조회 API의 응답을 공통 형태로 정규화한 것(001-02(소셜로그인) 2-2-4장).
 * phone은 네이버만 내려주므로 카카오/구글은 항상 null이다(2-3-3장).
 * profileImageUrl은 세 플랫폼 모두 제공하나(구글은 사실상 항상 값이 옴), 값이 없으면 null일 수 있다.
 * emailVerified(2026-08-10 보안 수정 추가) — 플랫폼이 이 이메일 주소를 실제로 소유 확인했는지 여부.
 * SocialLoginServiceImpl이 "같은 이메일=같은 사람" 자동 계정 연동을 할 때, 이게 false인 이메일로는
 * 절대 연동하지 않도록 막는 데 쓴다(그렇지 않으면 미인증 이메일을 자칭해 남의 계정에 로그인 가능).
 */
public record SocialUserProfile(String providerUserId, String email, boolean emailVerified, String nickname,
                                 String phone, String profileImageUrl) {
}
