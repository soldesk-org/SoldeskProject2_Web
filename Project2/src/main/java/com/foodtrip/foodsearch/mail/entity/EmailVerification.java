package com.foodtrip.foodsearch.mail.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "email_verifications")
public class EmailVerification {

    public static final String PURPOSE_SIGNUP = "SIGNUP";
    public static final String PURPOSE_PROFILE_EMAIL_UPDATE = "PROFILE_EMAIL_UPDATE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "email_verification_id")
    private Long emailVerificationId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "verification_code", nullable = false, length = 20)
    private String verificationCode;

    // columnDefinition으로 DB 레벨 DEFAULT를 지정 - 기존 email_verifications 테이블에 새 NOT NULL
    // 컬럼을 추가하는 것이라, 이미 있는 행(있다면)의 NOT NULL 제약 위반을 막기 위함.
    @Column(name = "purpose", nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'SIGNUP'")
    private String purpose;

    @Column(name = "is_verified", nullable = false)
    private Boolean verified;

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected EmailVerification() {
    }

    public static EmailVerification create(Long memberId, String email, String verificationCode,
                                            String purpose, LocalDateTime expiredAt) {
        EmailVerification verification = new EmailVerification();
        verification.memberId = memberId;
        verification.email = email;
        verification.verificationCode = verificationCode;
        verification.purpose = purpose;
        verification.verified = false;
        verification.expiredAt = expiredAt;
        return verification;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void markVerified() {
        this.verified = true;
        this.verifiedAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiredAt);
    }

    public boolean matchesCode(String code) {
        return this.verificationCode.equals(code);
    }

    public Long getEmailVerificationId() {
        return emailVerificationId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getEmail() {
        return email;
    }

    public String getPurpose() {
        return purpose;
    }

    public Boolean getVerified() {
        return verified;
    }

    public LocalDateTime getExpiredAt() {
        return expiredAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
