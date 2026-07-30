package com.foodtrip.foodsearch.member.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "member_credentials")
public class MemberCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_credential_id")
    private Long memberCredentialId;

    @Column(name = "member_id", nullable = false, unique = true)
    private Long memberId;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "password_updated_at")
    private LocalDateTime passwordUpdatedAt;

    // 로그인 실패 카운트/잠금은 Redis(LoginAttemptService)로 이전되어 더 이상 이 컬럼을 갱신하지 않는다.
    // DB 컬럼/엔티티 필드는 과거 데이터 및 스키마 호환을 위해 남겨둠.
    @Column(name = "login_fail_count", nullable = false)
    private Integer loginFailCount;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected MemberCredential() {
    }

    public static MemberCredential create(Long memberId, String passwordHash) {
        MemberCredential credential = new MemberCredential();
        credential.memberId = memberId;
        credential.passwordHash = passwordHash;
        credential.loginFailCount = 0;
        return credential;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.passwordUpdatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updatePassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        this.passwordUpdatedAt = LocalDateTime.now();
    }

    public Long getMemberCredentialId() {
        return memberCredentialId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Integer getLoginFailCount() {
        return loginFailCount;
    }

    public LocalDateTime getLockedUntil() {
        return lockedUntil;
    }
}
