package com.foodtrip.foodsearch.appversion.dto;

// iOS 앱이 실행 시 자기 빌드 번호(CFBundleVersion)를 보고하는 요청.
public class ReportBuildRequestDto {

    // 앱의 빌드 번호. 웹(브라우저)에서는 보내지 않을 수 있어 필수는 아니다.
    private Long build;

    public Long getBuild() {
        return build;
    }

    public void setBuild(Long build) {
        this.build = build;
    }
}
