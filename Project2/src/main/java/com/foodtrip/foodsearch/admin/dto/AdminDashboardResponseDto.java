package com.foodtrip.foodsearch.admin.dto;

// 14(관리자-권한) 2차 — "회원 관리(전체/일반/사업자 수), 리뷰 관리(작성된 리뷰 수/신고된 리뷰 수)" 요청으로
// 신규 추가. 음식점 관리 통계가 없는 이유: restaurants 테이블은 카카오 ToS 준수를 위해 상호명/주소를 저장
// 하지 않는 "부가정보"뿐이라(07 참고), "우리 DB에 몇 개의 음식점이 있다" 같은 통계 자체가 의미가 약해서
// 이번 대시보드에는 포함하지 않았다(사용자도 "DB 저장이 금지되기 때문에 구현 불가"로 확인, 001-01 참고).
public class AdminDashboardResponseDto {

    private final long memberTotal;
    private final long memberGeneral;
    private final long memberBusiness;
    private final long memberAdmin;
    private final long reviewTotal;
    private final long reviewReported;

    public AdminDashboardResponseDto(long memberTotal, long memberGeneral, long memberBusiness, long memberAdmin,
                                      long reviewTotal, long reviewReported) {
        this.memberTotal = memberTotal;
        this.memberGeneral = memberGeneral;
        this.memberBusiness = memberBusiness;
        this.memberAdmin = memberAdmin;
        this.reviewTotal = reviewTotal;
        this.reviewReported = reviewReported;
    }

    public long getMemberTotal() {
        return memberTotal;
    }

    public long getMemberGeneral() {
        return memberGeneral;
    }

    public long getMemberBusiness() {
        return memberBusiness;
    }

    public long getMemberAdmin() {
        return memberAdmin;
    }

    public long getReviewTotal() {
        return reviewTotal;
    }

    public long getReviewReported() {
        return reviewReported;
    }
}
