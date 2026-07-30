package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.SearchHistory;

public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {

    List<SearchHistory> findByMemberIdOrderByCreatedAtDesc(Long memberId);

    Optional<SearchHistory> findBySearchHistoryIdAndMemberId(Long searchHistoryId, Long memberId);

    // 중복 검색 시 새로 만들지 않고 이 행을 찾아 touch()하기 위한 조회(2026-07-22 추가).
    Optional<SearchHistory> findByMemberIdAndKeyword(Long memberId, String keyword);

    void deleteByMemberId(Long memberId);
}
