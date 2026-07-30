package com.foodtrip.foodsearch.mail.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.mail.entity.EmailVerification;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findTopByMemberIdAndPurposeOrderByCreatedAtDesc(Long memberId, String purpose);

    @Modifying
    @Query("DELETE FROM EmailVerification e WHERE e.memberId IN :memberIds")
    void deleteByMemberIdIn(@Param("memberIds") List<Long> memberIds);
}
