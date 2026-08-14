package com.foodtrip.foodsearch.terms.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.terms.dto.NoticeDetailResponseDto;
import com.foodtrip.foodsearch.terms.dto.NoticeSummaryResponseDto;
import com.foodtrip.foodsearch.terms.service.NoticeService;

// 공개 API — 약관 변경 공지 게시판(회원 개인별 알림 벨 notification 패키지와는 무관한 공개 게시판).
@RestController
public class NoticeController {

    private final NoticeService noticeService;

    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping("/api/notices")
    public List<NoticeSummaryResponseDto> listNotices() {
        return noticeService.listNotices();
    }

    @GetMapping("/api/notices/{noticeId}")
    public NoticeDetailResponseDto getNoticeDetail(@PathVariable Long noticeId) {
        return noticeService.getNoticeDetail(noticeId);
    }
}
