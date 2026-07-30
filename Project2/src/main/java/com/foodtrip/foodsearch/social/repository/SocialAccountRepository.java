package com.foodtrip.foodsearch.social.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.social.entity.SocialAccount;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {

    // 콜백 처리(001-02 2-4장): (provider, provider_user_id) 조합으로 이미 연동된 회원인지 조회.
    Optional<SocialAccount> findByProviderAndProviderUserId(String provider, String providerUserId);

    // 연동 해제(001-02 2-6장): 로그인한 회원 본인의 그 provider 연동 정보만 조회.
    Optional<SocialAccount> findByMemberIdAndProvider(Long memberId, String provider);

    // 회원정보수정(001-02(회원정보수정) 2-5장)의 비밀번호 변경 차단 가드: 이 회원이 소셜 계정인지 판별.
    boolean existsByMemberId(Long memberId);

    List<SocialAccount> findAllByMemberId(Long memberId);
}
