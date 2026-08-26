package com.foodtrip.foodsearch.appversion.dto;

// 서버가 기록 중인 iOS 앱 최신 빌드 번호 응답. 웹은 이 값과 설치된 빌드를 비교해 업데이트 안내를 띄운다.
public class AppVersionResponseDto {

    private final long latestBuild;

    public AppVersionResponseDto(long latestBuild) {
        this.latestBuild = latestBuild;
    }

    public long getLatestBuild() {
        return latestBuild;
    }
}
