package com.foodtrip.foodsearch.phone.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.phone.entity.PhoneVerification;

public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {

    Optional<PhoneVerification> findTopByMemberIdAndPurposeOrderByCreatedAtDesc(Long memberId, String purpose);
}
