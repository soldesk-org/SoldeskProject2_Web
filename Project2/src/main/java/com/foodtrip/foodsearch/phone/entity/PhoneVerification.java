package com.foodtrip.foodsearch.phone.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "phone_verifications")
public class PhoneVerification {

    public static final String PURPOSE_SIGNUP = "SIGNUP";
    public static final String PURPOSE_FIND_EMAIL = "FIND_EMAIL";
    public static final String PURPOSE_PROFILE_UPDATE = "PROFILE_PHONE_UPDATE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "phone_verification_id")
    private Long phoneVerificationId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "verification_code", nullable = false, length = 20)
    private String verificationCode;

    @Column(name = "purpose", nullable = false, length = 20)
    private String purpose;

    @Column(name = "is_verified", nullable = false)
    private Boolean verified;

    @Column(name = "expired_at", nullable = false)
    private LocalDateTime expiredAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected PhoneVerification() {
    }

    public static PhoneVerification create(Long memberId, String phone, String verificationCode,
                                            String purpose, LocalDateTime expiredAt) {
        PhoneVerification verification = new PhoneVerification();
        verification.memberId = memberId;
        verification.phone = phone;
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

    public boolean matchesPhone(String phone) {
        return this.phone.equals(phone);
    }

    public Long getPhoneVerificationId() {
        return phoneVerificationId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getPhone() {
        return phone;
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

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }
}
