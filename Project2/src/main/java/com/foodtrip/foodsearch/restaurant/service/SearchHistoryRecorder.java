package com.foodtrip.foodsearch.restaurant.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.restaurant.entity.SearchHistory;
import com.foodtrip.foodsearch.restaurant.repository.SearchHistoryRepository;

// 검색 기록 저장(2026-07-22 추가) — RestaurantServiceImpl은 클래스 전체가
// @Transactional(readOnly = true)라 그 안에서 직접 INSERT할 수 없다. ReceiptSuccessRecorder와 같은 이유로
// 쓰기 전용의 작은 컴포넌트로 분리했다.
@Component
public class SearchHistoryRecorder {

    private final SearchHistoryRepository searchHistoryRepository;

    public SearchHistoryRecorder(SearchHistoryRepository searchHistoryRepository) {
        this.searchHistoryRepository = searchHistoryRepository;
    }

    // 같은 (memberId, keyword) 행이 이미 있으면 새로 만들지 않고 touch()만 해서 "최근 검색"으로
    // 다시 끌어올린다(2026-07-22 변경 — 예전엔 매번 새 행을 쌓아서 같은 키워드로 반복 검색하면
    // 목록이 계속 늘어나는 문제가 있었음).
    @Transactional
    public void record(Long memberId, String keyword) {
        searchHistoryRepository.findByMemberIdAndKeyword(memberId, keyword)
                .ifPresentOrElse(
                        SearchHistory::touch,
                        () -> searchHistoryRepository.save(SearchHistory.create(memberId, keyword)));
    }
}
