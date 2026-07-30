package com.foodtrip.foodsearch.social.service;

import java.util.Map;

import com.foodtrip.foodsearch.member.dto.LoginResponseDto;
import com.foodtrip.foodsearch.social.dto.UnlinkResponseDto;

public interface SocialLoginService {

    String buildAuthorizeUrl(String providerPath);

    LoginResponseDto handleCallback(String providerPath, String code, String state);

    UnlinkResponseDto unlink(String authorizationHeader, String providerPath);

    void handleNaverUnlinkCallback(Map<String, String> params);
}
