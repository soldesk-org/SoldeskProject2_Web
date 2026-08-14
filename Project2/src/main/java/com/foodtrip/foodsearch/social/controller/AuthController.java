package com.foodtrip.foodsearch.social.controller;

import java.net.URI;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.member.dto.LoginResponseDto;
import com.foodtrip.foodsearch.social.dto.UnlinkResponseDto;
import com.foodtrip.foodsearch.social.service.SocialLoginService;

/**
 * 소셜로그인(001-02(소셜로그인) 5장). REST 라우팅 전면 개편(2026-08-14)으로 콜백 경로가
 * /oauth/{provider} → /api/oauth-providers/{provider}/callback 으로 바뀌었다 — 카카오/네이버/구글
 * 개발자 콘솔에 등록된 Redirect URI도 반드시 함께 갱신해야 한다(docs/00.공통/REST-라우팅-전면개편-2026-08-14.md 참고).
 */
@RestController
public class AuthController {

    private final SocialLoginService socialLoginService;

    // 콜백 처리 후 리다이렉트할 프론트 주소(2026-07-21 추가 — 001-04 문서 5장에서 "프론트 라우팅이
    // 정해지면 알려달라"고 남겨뒀던 부분). 실제 프론트 주소가 정해지기 전까지는 지도 테스트 페이지
    // (tmp-map-test.html)를 임시 대상으로 쓴다 — 그 페이지가 accessToken/refreshToken 쿼리 파라미터를
    // 읽어 로그인 상태로 반영하도록 만들어져 있다. 실제 프론트 주소가 정해지면 .env의
    // OAUTH_FRONTEND_REDIRECT_URL만 바꾸면 된다.
    @Value("${oauth.frontend-redirect-url:http://localhost:8081/tmp-map-test.html}")
    private String frontendRedirectUrl;

    public AuthController(SocialLoginService socialLoginService) {
        this.socialLoginService = socialLoginService;
    }

    @GetMapping("/api/oauth-providers/{provider}/authorization")
    public ResponseEntity<Void> authorize(@PathVariable String provider,
                                           @RequestParam(defaultValue = "false") boolean rememberMe) {
        String authorizeUrl = socialLoginService.buildAuthorizeUrl(provider, rememberMe);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(authorizeUrl)).build();
    }

    // 예전엔 로그인 결과(LoginResponseDto)를 JSON으로 그대로 응답해서 브라우저에 원본 JSON이 노출됐다
    // (001-03/001-04 문서에 "미완성"으로 남겨뒀던 부분). 이제 성공/실패 모두 프론트 주소로 302 리다이렉트
    // 하면서 결과를 쿼리 파라미터로 실어 보낸다 — 회원가입 이메일 인증 등에서 이미 쓰던
    // "{프론트주소}?token=..." 패턴과 동일한 방식(001-04 문서 2장 4번에서 제안했던 그대로).
    @GetMapping("/api/oauth-providers/{provider}/callback")
    public ResponseEntity<Void> callback(@PathVariable String provider,
                                          @RequestParam(required = false) String code,
                                          @RequestParam(required = false) String state) {
        try {
            if (code == null || code.isBlank()) {
                throw new CustomException(ErrorCode.INVALID_INPUT, "인가코드(code)가 없습니다.");
            }
            LoginResponseDto result = socialLoginService.handleCallback(provider, code, state);
            URI redirectUri = UriComponentsBuilder.fromUriString(frontendRedirectUrl)
                    .queryParam("accessToken", result.getAccessToken())
                    .queryParam("refreshToken", result.getRefreshToken())
                    .queryParam("memberId", result.getMemberId())
                    .queryParam("rememberMe", result.isRememberMe())
                    .build()
                    .encode()
                    .toUri();
            return ResponseEntity.status(HttpStatus.FOUND).location(redirectUri).build();
        } catch (CustomException e) {
            URI redirectUri = UriComponentsBuilder.fromUriString(frontendRedirectUrl)
                    .queryParam("error", e.getErrorCode().name())
                    .queryParam("errorMessage", e.getMessage())
                    .build()
                    .encode()
                    .toUri();
            return ResponseEntity.status(HttpStatus.FOUND).location(redirectUri).build();
        }
    }

    @DeleteMapping("/api/oauth-providers/{provider}/link")
    public UnlinkResponseDto unlink(@PathVariable String provider,
                                     @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return socialLoginService.unlink(authorizationHeader, provider);
    }

    @GetMapping("/api/oauth-providers/naver/unlink-callback")
    public ResponseEntity<Void> naverUnlinkCallback(@RequestParam Map<String, String> params) {
        socialLoginService.handleNaverUnlinkCallback(params);
        return ResponseEntity.ok().build();
    }
}
