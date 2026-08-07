package com.foodtrip.foodsearch.admin.service;

import java.util.List;

import com.foodtrip.foodsearch.admin.dto.AdminActionResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminDashboardResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminMemberResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminReviewResponseDto;

public interface AdminService {

    // role이 null/blank면 전체, 아니면 그 역할("USER"/"BUSINESS"/"ADMIN")만 필터(14.관리자-권한 2차 추가).
    List<AdminMemberResponseDto> listMembers(String role);

    AdminDashboardResponseDto getDashboard();

    AdminActionResponseDto suspendMember(Long memberId);

    AdminActionResponseDto unsuspendMember(Long memberId);

    List<AdminReviewResponseDto> listReviews();

    AdminActionResponseDto deleteReview(Long reviewId);

    // 관리자 공지 발송(2026-08-06 추가) — 활성 회원 전체에게 알림 벨로 공지를 뿌린다.
    AdminActionResponseDto broadcastNotification(String title, String body);
}
