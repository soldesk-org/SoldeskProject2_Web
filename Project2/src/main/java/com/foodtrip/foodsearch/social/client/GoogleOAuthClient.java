package com.foodtrip.foodsearch.social.client;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.social.entity.SocialAccount;

/**
 * 구글 로그인 연동(001-02(소셜로그인) 5장). 구글은 "닉네임" 개념이 없어 name(성명)만 내려준다 —
 * SocialLoginService에서 닉네임 후보로 name을 쓰거나, 없으면 이메일 로컬파트로 대체한다(001-02 8장).
 */
@Component
public class GoogleOAuthClient implements SocialOAuthClient {

    private static final String AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String SCOPE = "https://www.googleapis.com/auth/userinfo.email "
            + "https://www.googleapis.com/auth/userinfo.profile";

    private final RestClient restClient = RestClient.create();
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public GoogleOAuthClient(@Value("${oauth.google.client-id}") String clientId,
                              @Value("${oauth.google.client-secret}") String clientSecret,
                              @Value("${oauth.google.redirect-uri}") String redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    @Override
    public String provider() {
        return SocialAccount.PROVIDER_GOOGLE;
    }

    @Override
    public String pathSegment() {
        return "google";
    }

    @Override
    public String buildAuthorizeUrl(String state) {
        return AUTHORIZE_URL
                + "?response_type=code"
                + "&client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&scope=" + encode(SCOPE)
                + "&state=" + encode(state);
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialTokenResponse exchangeCodeForToken(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        Map<String, Object> body;
        try {
            body = restClient.post()
                    .uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "구글 토큰 발급에 실패했습니다: " + e.getMessage());
        }
        if (body == null || body.get("access_token") == null) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "구글 토큰 발급 응답이 올바르지 않습니다.");
        }

        Number expiresIn = (Number) body.get("expires_in");
        return new SocialTokenResponse(
                String.valueOf(body.get("access_token")),
                body.get("refresh_token") != null ? String.valueOf(body.get("refresh_token")) : null,
                expiresIn != null ? expiresIn.longValue() : null
        );
    }

    @Override
    @SuppressWarnings("unchecked")
    public SocialUserProfile fetchUserProfile(String platformAccessToken) {
        Map<String, Object> body;
        try {
            body = restClient.get()
                    .uri("https://www.googleapis.com/oauth2/v2/userinfo")
                    .header("Authorization", "Bearer " + platformAccessToken)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "구글 사용자 정보 조회에 실패했습니다: " + e.getMessage());
        }
        if (body == null || body.get("id") == null || body.get("email") == null) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "구글 사용자 정보 응답이 올바르지 않습니다.");
        }

        return new SocialUserProfile(
                String.valueOf(body.get("id")),
                (String) body.get("email"),
                (String) body.get("name"),
                null,
                (String) body.get("picture")
        );
    }

    @Override
    public void unlink(String platformAccessToken, String platformRefreshToken) {
        try {
            restClient.post()
                    .uri("https://oauth2.googleapis.com/revoke?token=" + encode(platformAccessToken))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_UNLINK_FAILED, "구글 연동 해제에 실패했습니다: " + e.getMessage());
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
