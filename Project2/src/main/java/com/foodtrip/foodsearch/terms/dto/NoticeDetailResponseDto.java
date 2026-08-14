package com.foodtrip.foodsearch.terms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.foodtrip.foodsearch.terms.entity.TermsChangeNotice;

// 공지 상세 = "변경 전"/"변경 후" 비교 화면. 요구사항에서 실제 line-diff 알고리즘은 필수가 아니라고
// 명시했고(작은 프로젝트 규모상 과함), 두 버전 전체 내용을 나란히 보여주는 것으로 충분하다고 판단했다
// (전에 버전이 없는 최초 버전 공지는 previousVersion이 null). previousVersion/newVersion 각각
// TermsDocumentDetailResponseDto를 그대로 재사용해서 프론트가 두 렌더링 로직(TOC 포함)을 그대로 재활용할
// 수 있게 했다.
public class NoticeDetailResponseDto {

    private final Long noticeId;
    private final String docType;
    private final String title;
    private final LocalDate effectiveDate;
    private final LocalDateTime postedAt;
    private final String noticeType;
    private final TermsDocumentDetailResponseDto previousVersion;
    private final TermsDocumentDetailResponseDto newVersion;

    public NoticeDetailResponseDto(TermsChangeNotice notice, TermsDocumentDetailResponseDto previousVersion,
                                    TermsDocumentDetailResponseDto newVersion) {
        this.noticeId = notice.getTermsChangeNoticeId();
        this.docType = notice.getDocType();
        this.title = notice.getTitle();
        this.effectiveDate = notice.getEffectiveDate();
        this.postedAt = notice.getPostedAt();
        this.noticeType = notice.getNoticeType();
        this.previousVersion = previousVersion;
        this.newVersion = newVersion;
    }

    public Long getNoticeId() {
        return noticeId;
    }

    public String getDocType() {
        return docType;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public LocalDateTime getPostedAt() {
        return postedAt;
    }

    public String getNoticeType() {
        return noticeType;
    }

    public TermsDocumentDetailResponseDto getPreviousVersion() {
        return previousVersion;
    }

    public TermsDocumentDetailResponseDto getNewVersion() {
        return newVersion;
    }
}
