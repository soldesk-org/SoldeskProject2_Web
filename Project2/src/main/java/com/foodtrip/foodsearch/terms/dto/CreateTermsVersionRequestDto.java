package com.foodtrip.foodsearch.terms.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// 관리자 화면에서 "새 버전 등록" 폼 하나로 버전 생성 + 변경 공지 게시까지 한 번에 처리한다(요구사항의
// "하나로 묶는 게 낫다"는 지침을 그대로 따름). noticeType은 두 번째 이후 버전(=이전 버전이 이미 있는 경우)
// 부터만 필수이고, 그 문서 타입의 첫 버전을 등록할 때는 비교 대상/공지 대상이 없어 굳이 요구하지 않는다
// (AdminTermsServiceImpl 참고).
public class CreateTermsVersionRequestDto {

    @NotBlank
    private String title;

    @NotBlank
    private String content;

    @NotNull
    private LocalDate effectiveDate;

    private String changeSummary;

    // "MINOR"(14일 전) / "MAJOR"(30일 전). 첫 버전 등록 시에는 생략 가능.
    private String noticeType;

    // 화면에 노출할 버전 라벨. 생략하면 effectiveDate로 자동 생성.
    private String versionLabel;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public void setEffectiveDate(LocalDate effectiveDate) {
        this.effectiveDate = effectiveDate;
    }

    public String getChangeSummary() {
        return changeSummary;
    }

    public void setChangeSummary(String changeSummary) {
        this.changeSummary = changeSummary;
    }

    public String getNoticeType() {
        return noticeType;
    }

    public void setNoticeType(String noticeType) {
        this.noticeType = noticeType;
    }

    public String getVersionLabel() {
        return versionLabel;
    }

    public void setVersionLabel(String versionLabel) {
        this.versionLabel = versionLabel;
    }
}
