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
}
