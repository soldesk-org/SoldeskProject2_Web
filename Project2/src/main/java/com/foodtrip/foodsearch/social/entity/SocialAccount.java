package com.foodtrip.foodsearch.social.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * 소셜 로그인 연동 정보(001-02(소셜로그인) 4-1장). DB-테이블설계.md 1-3장에 이미 정의돼 있던
 * social_accounts 테이블을 그대로 매핑한다(스키마 변경 없음).
 */
@Entity
@Table(name = "social_accounts")
public class SocialAccount {

    public static final String PROVIDER_KAKAO = "KAKAO";
    public static final String PROVIDER_NAVER = "NAVER";
    public static final String PROVIDER_GOOGLE = "GOOGLE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "social_account_id")
    private Long socialAccountId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "provider", nullable = false, length = 20)
    private String provider;

    @Column(name = "provider_user_id", nullable = false, length = 255)
    private String providerUserId;

    @Column(name = "access_token", length = 1000)
    private String accessToken;

    @Column(name = "refresh_token", length = 1000)
    private String refreshToken;

    @Column(name = "token_expired_at")
    private LocalDateTime tokenExpiredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected SocialAccount() {
    }

    public static SocialAccount create(Long memberId, String provider, String providerUserId,
                                        String accessToken, String refreshToken, LocalDateTime tokenExpiredAt) {
        SocialAccount socialAccount = new SocialAccount();
        socialAccount.memberId = memberId;
        socialAccount.provider = provider;
        socialAccount.providerUserId = providerUserId;
        socialAccount.accessToken = accessToken;
        socialAccount.refreshToken = refreshToken;
        socialAccount.tokenExpiredAt = tokenExpiredAt;
        return socialAccount;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // 재로그인(001-02 2-4장) 시 플랫폼 토큰을 최신 값으로 갱신한다.
    public void updateTokens(String accessToken, String refreshToken, LocalDateTime tokenExpiredAt) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiredAt = tokenExpiredAt;
    }

    public Long getSocialAccountId() {
        return socialAccountId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderUserId() {
        return providerUserId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public LocalDateTime getTokenExpiredAt() {
        return tokenExpiredAt;
    }
}
