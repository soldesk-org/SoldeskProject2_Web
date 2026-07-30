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
 * 카카오 로그인 연동(001-02(소셜로그인) 5장). 카카오 개발자 콘솔에서 "카카오 로그인" 클라이언트 시크릿이
 * 활성화(ON)되어 있음을 확인해(001-03 3장), client_secret을 포함해 토큰을 요청한다.
 */
@Component
public class KakaoOAuthClient implements SocialOAuthClient {

    private static final String AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";

    private final RestClient tokenClient = RestClient.create();
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public KakaoOAuthClient(@Value("${oauth.kakao.client-id}") String clientId,
                             @Value("${oauth.kakao.client-secret:}") String clientSecret,
                             @Value("${oauth.kakao.redirect-uri}") String redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    @Override
    public String provider() {
        return SocialAccount.PROVIDER_KAKAO;
    }

    @Override
    public String pathSegment() {
        return "kakao";
    }

    @Override
    public String buildAuthorizeUrl(String state) {
        return AUTHORIZE_URL
                + "?response_type=code"
                + "&client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&state=" + encode(state);
    }

    @Override
    public SocialTokenResponse exchangeCodeForToken(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        if (clientSecret != null && !clientSecret.isBlank()) {
            form.add("client_secret", clientSecret);
        }
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        Map<String, Object> body = post("https://kauth.kakao.com/oauth/token", form);
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
            body = tokenClient.get()
                    .uri("https://kapi.kakao.com/v2/user/me")
                    .header("Authorization", "Bearer " + platformAccessToken)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "카카오 사용자 정보 조회에 실패했습니다: " + e.getMessage());
        }
        if (body == null || body.get("id") == null) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "카카오 사용자 정보 응답이 올바르지 않습니다.");
        }

        Map<String, Object> kakaoAccount = (Map<String, Object>) body.get("kakao_account");
        String email = kakaoAccount != null ? (String) kakaoAccount.get("email") : null;
        String nickname = null;
        String profileImageUrl = null;
        if (kakaoAccount != null) {
            Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
            if (profile != null) {
                nickname = (String) profile.get("nickname");
                profileImageUrl = (String) profile.get("profile_image_url");
            }
        }
        if (email == null) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "카카오 계정에서 이메일을 가져올 수 없습니다(이메일 제공 동의 필요).");
        }

        return new SocialUserProfile(String.valueOf(body.get("id")), email, nickname, null, profileImageUrl);
    }

    @Override
    public void unlink(String platformAccessToken, String platformRefreshToken) {
        try {
            tokenClient.post()
                    .uri("https://kapi.kakao.com/v1/user/unlink")
                    .header("Authorization", "Bearer " + platformAccessToken)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_UNLINK_FAILED, "카카오 연동 해제에 실패했습니다: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> post(String url, MultiValueMap<String, String> form) {
        try {
            return tokenClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "카카오 토큰 발급에 실패했습니다: " + e.getMessage());
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
