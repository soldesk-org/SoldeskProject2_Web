package com.foodtrip.foodsearch.business.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.business.entity.BusinessProfile;

public interface BusinessProfileRepository extends JpaRepository<BusinessProfile, Long> {

    boolean existsByBusinessRegistrationNumber(String businessRegistrationNumber);

    // 사업자 마이페이지 "내 매장 관리" 헤더(2026-08-06 추가) — 로그인한 사업자 본인의 상호명/주소/
    // 사업자등록번호를 보여주기 위함. 이전엔 이 정보가 화면에 고정 시안 값("잇티식당 강남점" 등)으로만
    // 박혀 있어서, 계정이 달라도 항상 같은 매장 정보가 보이는 버그가 있었다.
    Optional<BusinessProfile> findByMemberId(Long memberId);
}
