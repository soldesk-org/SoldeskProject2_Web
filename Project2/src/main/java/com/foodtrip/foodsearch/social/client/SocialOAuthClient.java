package com.foodtrip.foodsearch.social.client;

/**
 * 플랫폼별 OAuth 연동(인가 URL 생성, 토큰 교환, 사용자 정보 조회, 연동 해제)의 공통 인터페이스.
 * 사업자인증 연동(BusinessVerificationClient)과 동일하게, 이 프로젝트 코드는 각 플랫폼 API를 호출만 하고
 * 실패 시 CustomException(ErrorCode.SOCIAL_LOGIN_FAILED / SOCIAL_UNLINK_FAILED)로 변환해 던진다.
 */
public interface SocialOAuthClient {

    /**
     * DB/응답에 저장할 provider 식별자(대문자, {@link com.foodtrip.foodsearch.social.entity.SocialAccount}의 상수와 동일).
     */
    String provider();

    /**
     * URL 경로변수로 쓰이는 소문자 식별자(kakao/naver/google). AuthController의 {provider} 매칭에 사용.
     */
    String pathSegment();

    String buildAuthorizeUrl(String state);

    SocialTokenResponse exchangeCodeForToken(String code);

    SocialUserProfile fetchUserProfile(String platformAccessToken);

    /**
     * 연동 해제(001-02 2-6장). 플랫폼별로 필요한 토큰(access_token 또는 refresh_token)이 다르므로
     * 저장돼 있는 SocialAccount의 두 토큰을 모두 넘긴다.
     */
    void unlink(String platformAccessToken, String platformRefreshToken);
}
