package com.foodtrip.foodsearch.member.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.member.entity.Member;

public interface MemberRepository extends JpaRepository<Member, Long> {

    // 관리자 회원 목록(14.관리자-권한, 2026-07-23 추가) — 최신 가입순.
    Page<Member> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 관리자 회원 관리 2차(2026-07-23) — "일반 회원 관리/사업자 회원 관리" 화면 분리용 role 필터.
    Page<Member> findAllByRoleOrderByCreatedAtDesc(String role, Pageable pageable);

    // 관리자 대시보드(2026-07-23 추가) — "전체 회원 수 / 일반 회원 / 사업자 회원" 통계.
    long countByRole(String role);

    Optional<Member> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    // phone 컬럼은 AES-256-GCM 암호문이라 매번 값이 달라져 조회에 쓸 수 없다.
    // 결정적(deterministic) 해시인 phone_hash로 중복 확인/조회한다.
    boolean existsByPhoneHash(String phoneHash);

    // 이메일 찾기: 닉네임 + 전화번호(해시)가 모두 일치하는 회원을 조회한다.
    Optional<Member> findByNicknameAndPhoneHash(String nickname, String phoneHash);

    // 회원정보수정(001-02(회원정보수정) 5-6장): "다른 회원"이 이미 쓰고 있는지 확인 - 본인의 현재 값과
    // 같은 경우(=실질적으로 값이 안 바뀐 경우)까지 중복으로 걸리지 않도록 본인은 제외하고 조회한다.
    boolean existsByNicknameAndMemberIdNot(String nickname, Long memberId);

    boolean existsByEmailAndMemberIdNot(String email, Long memberId);

    boolean existsByPhoneHashAndMemberIdNot(String phoneHash, Long memberId);

    // 이메일 인증만 받고(또는 인증조차 없이) member_credentials가 생성되지 않은 채
    // cutoff 이전에 만들어진 members row(=회원가입을 끝까지 완료하지 않고 이탈한 row)를 찾는다.
    // 소셜로그인 계정(001-02(소셜로그인) 4-2장)은 애초에 비밀번호가 없어 member_credentials가 영구히
    // 생성되지 않으므로, social_accounts에 연결된 회원은 "미완료 이탈 회원"이 아니라는 걸 명시적으로 제외해야
    // 24시간 뒤 소셜 계정이 통째로 삭제되는 사고를 막을 수 있다.
    @Query("SELECT m.memberId FROM Member m "
            + "WHERE m.createdAt < :cutoff "
            + "AND m.memberId NOT IN (SELECT mc.memberId FROM MemberCredential mc) "
            + "AND m.memberId NOT IN (SELECT sa.memberId FROM SocialAccount sa)")
    List<Long> findUnverifiedMemberIdsCreatedBefore(@Param("cutoff") LocalDateTime cutoff);
}
