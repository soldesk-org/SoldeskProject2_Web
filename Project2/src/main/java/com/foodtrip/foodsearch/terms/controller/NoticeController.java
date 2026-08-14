package com.foodtrip.foodsearch.terms.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.terms.dto.NoticeDetailResponseDto;
import com.foodtrip.foodsearch.terms.service.NoticeService;

// 공개 API — 약관 변경 공지 상세(2026-08-14 수정: 목록 API는 제거했다 — 별도 공지 게시판을 두지 않고,
// 회원 알림 벨(Notification, TYPE_NOTICE)로만 이 링크가 전달되게 하기로 했다. 이 링크 없이는
// noticeId를 알 방법이 없어 "직접 링크가 있어야만 들어오는 페이지"가 된다).
@RestController
public class NoticeController {

    private final NoticeService noticeService;

    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping("/api/notices/{noticeId}")
    public NoticeDetailResponseDto getNoticeDetail(@PathVariable Long noticeId) {
        return noticeService.getNoticeDetail(noticeId);
    }
}
