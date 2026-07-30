package com.foodtrip.foodsearch.business.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// business_profiles 테이블은 이미 DB에 만들어져 있었다(DB-테이블설계.md 기준 스키마가 사전에 일괄 구축됨).
// 기존 UNIQUE 제약 이름(uq_business_profiles_reg_no)에 맞춰 지정한다 - 이름이 어긋나면
// MemberServiceImpl의 saveAndFlush 예외 처리에서 제약 위반을 구분하지 못한다
// (01.회원가입 001-03 5-2장에서 겪은 phone_hash 제약 이름 불일치와 같은 종류의 문제).
@Entity
@Table(name = "business_profiles",
        uniqueConstraints = @UniqueConstraint(name = "uq_business_profiles_reg_no", columnNames = "business_registration_number"))
public class BusinessProfile {

    public static final String STATUS_VERIFIED = "VERIFIED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "business_profile_id")
    private Long businessProfileId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "business_name", nullable = false, length = 200)
    private String businessName;

    // 사업자등록증명원 OCR로 추출한 값을 그대로 저장한다(하이픈 없는 숫자 10자리).
    @Column(name = "business_registration_number", nullable = false, length = 20)
    private String businessRegistrationNumber;

    @Column(name = "representative_name", nullable = false, length = 50)
    private String representativeName;

    @Column(name = "business_address", length = 300)
    private String businessAddress;

    @Column(name = "verification_status", nullable = false, length = 20)
    private String verificationStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected BusinessProfile() {
    }

    public static BusinessProfile createVerified(Long memberId, String businessName,
                                                  String businessRegistrationNumber, String representativeName,
                                                  String businessAddress) {
        BusinessProfile profile = new BusinessProfile();
        profile.memberId = memberId;
        profile.businessName = businessName;
        profile.businessRegistrationNumber = businessRegistrationNumber;
        profile.representativeName = representativeName;
        // OCR이 주소를 못 읽었으면(빈 문자열) null로 저장 — 자동귀속(07 기능)에서 blank/null 둘 다
        // "주소 없음"으로 취급하면 되므로 굳이 빈 문자열을 그대로 저장하지 않는다.
        profile.businessAddress = (businessAddress == null || businessAddress.isBlank()) ? null : businessAddress;
        profile.verificationStatus = STATUS_VERIFIED;
        return profile;
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

    public Long getBusinessProfileId() {
        return businessProfileId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getBusinessName() {
        return businessName;
    }

    public String getBusinessRegistrationNumber() {
        return businessRegistrationNumber;
    }

    public String getRepresentativeName() {
        return representativeName;
    }

    public String getBusinessAddress() {
        return businessAddress;
    }

    public String getVerificationStatus() {
        return verificationStatus;
    }
}
