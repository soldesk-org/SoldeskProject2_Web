package com.foodtrip.foodsearch.member.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.member.entity.MemberCredential;

public interface MemberCredentialRepository extends JpaRepository<MemberCredential, Long> {

    Optional<MemberCredential> findByMemberId(Long memberId);

    boolean existsByMemberId(Long memberId);
}
