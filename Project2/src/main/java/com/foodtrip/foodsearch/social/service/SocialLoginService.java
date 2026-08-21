package com.foodtrip.foodsearch.social.service;

import java.util.Map;

import com.foodtrip.foodsearch.member.dto.LoginResponseDto;
import com.foodtrip.foodsearch.social.dto.UnlinkResponseDto;

public interface SocialLoginService {

    /**
     * @param appClient iOS 앱이 시스템 브라우저로 시작한 요청이면 true. 콜백 결과를 웹 페이지가 아니라
     *                  앱 커스텀 스킴으로 되돌려줘야 하는지 판단하는 데 쓰인다(OAuthStateService 참고).
     */
    String buildAuthorizeUrl(String providerPath, boolean rememberMe, boolean appClient);

    LoginResponseDto handleCallback(String providerPath, String code, String state);

    /** 콜백에서 결과를 되돌려줄 곳을 정하기 위해, state를 소비하지 않고 앱 요청인지만 확인한다. */
    boolean isAppClientState(String state);

    UnlinkResponseDto unlink(String authorizationHeader, String providerPath);

    void handleNaverUnlinkCallback(Map<String, String> params);
}
