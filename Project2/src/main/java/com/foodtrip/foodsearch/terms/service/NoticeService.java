package com.foodtrip.foodsearch.terms.service;

import java.util.List;

import com.foodtrip.foodsearch.terms.dto.NoticeDetailResponseDto;
import com.foodtrip.foodsearch.terms.dto.NoticeSummaryResponseDto;

public interface NoticeService {

    List<NoticeSummaryResponseDto> listNotices();

    NoticeDetailResponseDto getNoticeDetail(Long noticeId);
}
