package com.foodtrip.foodsearch.terms.service;

import com.foodtrip.foodsearch.terms.dto.NoticeDetailResponseDto;

// 공개 목록 API는 없다(2026-08-14 결정) — 공지는 알림(Notification) 벨을 통해서만 도달하고, 그 링크
// (notice-detail?id=...) 없이는 못 들어오게 한다는 요구사항에 맞춰 상세 조회만 남긴다.
public interface NoticeService {

    NoticeDetailResponseDto getNoticeDetail(Long noticeId);
}
