package com.foodtrip.foodsearch.social.client;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.social.entity.SocialAccount;

/**
 * 네이버 로그인 연동(001-02(소셜로그인) 5장). 네이버는 토큰 발급/연동해제 API가 POST 바디가 아니라
 * 쿼리 파라미터를 쓰는 GET 방식이라(요청사항 원문의 연동 해제 URL도 GET) 다른 두 플랫폼과 호출 방식이 다르다.
 */
@Component
public class NaverOAuthClient implements SocialOAuthClient {

    private static final String AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize";
    private static final String TOKEN_URL = "https://nid.naver.com/oauth2.0/token";

    private final RestClient restClient = RestClient.create();
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public NaverOAuthClient(@Value("${oauth.naver.client-id}") String clientId,
                             @Value("${oauth.naver.client-secret}") String clientSecret,
                             @Value("${oauth.naver.redirect-uri}") String redirectUri) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    @Override
    public String provider() {
        return SocialAccount.PROVIDER_NAVER;
    }

    @Override
    public String pathSegment() {
        return "naver";
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
    @SuppressWarnings("unchecked")
    public SocialTokenResponse exchangeCodeForToken(String code) {
        Map<String, Object> body;
        try {
            body = restClient.get()
                    .uri(TOKEN_URL
                            + "?grant_type=authorization_code"
                            + "&client_id=" + encode(clientId)
                            + "&client_secret=" + encode(clientSecret)
                            + "&code=" + encode(code))
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "네이버 토큰 발급에 실패했습니다: " + e.getMessage());
        }
        if (body == null || body.get("access_token") == null) {
            String error = body != null ? String.valueOf(body.get("error_description")) : "응답 없음";
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "네이버 토큰 발급에 실패했습니다: " + error);
        }

        Number expiresIn = body.get("expires_in") != null ? Long.valueOf(String.valueOf(body.get("expires_in"))) : null;
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
                    .uri("https://openapi.naver.com/v1/nid/me")
                    .header("Authorization", "Bearer " + platformAccessToken)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "네이버 사용자 정보 조회에 실패했습니다: " + e.getMessage());
        }
        if (body == null || !"00".equals(String.valueOf(body.get("resultcode")))) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "네이버 사용자 정보 응답이 올바르지 않습니다.");
        }

        Map<String, Object> response = (Map<String, Object>) body.get("response");
        if (response == null || response.get("email") == null) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "네이버 계정에서 이메일을 가져올 수 없습니다(이메일 제공 동의 필요).");
        }

        return new SocialUserProfile(
                String.valueOf(response.get("id")),
                (String) response.get("email"),
                (String) response.get("nickname"),
                (String) response.get("mobile"),
                (String) response.get("profile_image")
        );
    }

    @Override
    @SuppressWarnings("unchecked")
    public void unlink(String platformAccessToken, String platformRefreshToken) {
        Map<String, Object> body;
        try {
            body = restClient.get()
                    .uri(TOKEN_URL
                            + "?grant_type=delete"
                            + "&client_id=" + encode(clientId)
                            + "&client_secret=" + encode(clientSecret)
                            + "&access_token=" + encode(platformAccessToken)
                            + "&service_provider=NAVER")
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SOCIAL_UNLINK_FAILED, "네이버 연동 해제에 실패했습니다: " + e.getMessage());
        }
        if (body == null || !"success".equalsIgnoreCase(String.valueOf(body.get("result")))) {
            throw new CustomException(ErrorCode.SOCIAL_UNLINK_FAILED, "네이버 연동 해제 응답이 올바르지 않습니다.");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
