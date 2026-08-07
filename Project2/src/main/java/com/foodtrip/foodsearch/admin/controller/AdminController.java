package com.foodtrip.foodsearch.admin.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.foodtrip.foodsearch.admin.dto.AdminActionResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminDashboardResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminMemberResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminReviewResponseDto;
import com.foodtrip.foodsearch.admin.dto.BroadcastNotificationRequestDto;
import com.foodtrip.foodsearch.admin.dto.SystemStatusItemDto;
import com.foodtrip.foodsearch.admin.service.AdminService;
import com.foodtrip.foodsearch.admin.service.SystemStatusService;
import com.foodtrip.foodsearch.chat.dto.AdminChatReportResponseDto;
import com.foodtrip.foodsearch.chat.dto.ChatActionResponseDto;
import com.foodtrip.foodsearch.chat.service.AdminChatService;
import com.foodtrip.foodsearch.parking.dto.ParkingSyncResponseDto;
import com.foodtrip.foodsearch.parking.service.ParkingSyncService;
import com.foodtrip.foodsearch.report.dto.AdminReportedReviewResponseDto;
import com.foodtrip.foodsearch.report.dto.ReportActionResponseDto;
import com.foodtrip.foodsearch.report.service.AdminReportService;

// 14(관리자-권한) — 이 컨트롤러의 모든 엔드포인트는 SecurityConfig에서 /api/admin/** 전체에
// hasRole("ADMIN")으로 이미 막혀있다(다른 도메인처럼 각 메서드에서 별도로 로그인/권한 체크를 하지 않음).
// 미로그인 401, 비관리자 403은 SecurityConfig의 authenticationEntryPoint/accessDeniedHandler가 처리.
@RestController
public class AdminController {

    private final AdminService adminService;
    private final SystemStatusService systemStatusService;
    private final ParkingSyncService parkingSyncService;
    private final AdminReportService adminReportService;
    private final AdminChatService adminChatService;

    public AdminController(AdminService adminService, SystemStatusService systemStatusService,
                            ParkingSyncService parkingSyncService, AdminReportService adminReportService,
                            AdminChatService adminChatService) {
        this.adminService = adminService;
        this.systemStatusService = systemStatusService;
        this.parkingSyncService = parkingSyncService;
        this.adminReportService = adminReportService;
        this.adminChatService = adminChatService;
    }

    @GetMapping("/api/admin/status")
    public List<SystemStatusItemDto> checkStatus() {
        return systemStatusService.checkAll();
    }

    // 2차 추가(2026-07-23) — 회원 관리 홈 화면 통계("전체/일반/사업자 회원 수", "작성된 리뷰 수/신고된 리뷰 수").
    @GetMapping("/api/admin/dashboard")
    public AdminDashboardResponseDto getDashboard() {
        return adminService.getDashboard();
    }

    // role 파라미터로 "일반 회원 관리"(role=USER)/"사업자 회원 관리"(role=BUSINESS) 화면 분리 가능(2차 추가).
    @GetMapping("/api/admin/members")
    public List<AdminMemberResponseDto> listMembers(@RequestParam(required = false) String role) {
        return adminService.listMembers(role);
    }

    @PatchMapping("/api/admin/members/{memberId}/suspend")
    public AdminActionResponseDto suspendMember(@PathVariable Long memberId) {
        return adminService.suspendMember(memberId);
    }

    @PatchMapping("/api/admin/members/{memberId}/unsuspend")
    public AdminActionResponseDto unsuspendMember(@PathVariable Long memberId) {
        return adminService.unsuspendMember(memberId);
    }

    @GetMapping("/api/admin/reviews")
    public List<AdminReviewResponseDto> listReviews() {
        return adminService.listReviews();
    }

    @DeleteMapping("/api/admin/reviews/{reviewId}")
    public AdminActionResponseDto deleteReview(@PathVariable Long reviewId) {
        return adminService.deleteReview(reviewId);
    }

    // 15(주차장-정보) — 공공데이터 동기화 수동 트리거(평소엔 자동 실행, 이건 즉시 강제 재동기화용 보조
    // 수단, docs/15.주차장-정보/001-02 2-6장 참고).
    @PostMapping("/api/admin/parking-lots/sync")
    public ParkingSyncResponseDto syncParkingLots(@RequestParam(defaultValue = "5") int maxPages) {
        return parkingSyncService.sync(maxPages);
    }

    // 16(리뷰-신고) — "신고 관리 - 신고된 리뷰 관리" 요청으로 신규 추가(2026-07-23 2차).
    // status 파라미터로 대기중(PENDING, 기본값)/처리완료(RESOLVED)/반려(REJECTED) 탭을 나눠서 조회 가능
    // (2026-07-23 3차 추가 — "처리된 기록도 볼 수 있게, 처리 불가도 있어야" 요청).
    @GetMapping("/api/admin/reports")
    public List<AdminReportedReviewResponseDto> listReportedReviews(@RequestParam(required = false) String status) {
        return adminReportService.listReportedReviews(status);
    }

    @PatchMapping("/api/admin/reports/{reviewId}/resolve")
    public ReportActionResponseDto resolveReport(@PathVariable Long reviewId) {
        return adminReportService.resolve(reviewId);
    }

    @PatchMapping("/api/admin/reports/{reviewId}/reject")
    public ReportActionResponseDto rejectReport(@PathVariable Long reviewId) {
        return adminReportService.reject(reviewId);
    }

    // 19(오픈채팅) — "신고 리스트에 저거들도 들어가게 나눠놔야" 요청으로, 리뷰 신고(위)와는 별도 목록으로
    // 분리된 채팅 신고 관리(방/메시지 신고를 함께 담음, 001-02 2-9장).
    @GetMapping("/api/admin/chat-reports")
    public List<AdminChatReportResponseDto> listChatReports(@RequestParam(required = false) String status) {
        return adminChatService.listChatReports(status);
    }

    @PatchMapping("/api/admin/chat-reports/{chatReportId}/resolve")
    public ChatActionResponseDto resolveChatReport(@PathVariable Long chatReportId) {
        return adminChatService.resolveReport(chatReportId);
    }

    @PatchMapping("/api/admin/chat-reports/{chatReportId}/reject")
    public ChatActionResponseDto rejectChatReport(@PathVariable Long chatReportId) {
        return adminChatService.rejectReport(chatReportId);
    }

    @DeleteMapping("/api/admin/chat-messages/{chatMessageId}")
    public ChatActionResponseDto deleteChatMessage(@PathVariable Long chatMessageId) {
        return adminChatService.deleteMessage(chatMessageId);
    }

    @DeleteMapping("/api/admin/chat-rooms/{chatRoomId}")
    public ChatActionResponseDto explodeChatRoom(@PathVariable Long chatRoomId) {
        return adminChatService.explodeRoom(chatRoomId);
    }

    // 관리자 공지 발송(2026-08-06 추가) — 활성 회원 전체에게 알림 벨로 공지를 뿌린다.
    @PostMapping("/api/admin/notifications/broadcast")
    public AdminActionResponseDto broadcastNotification(@Valid @RequestBody BroadcastNotificationRequestDto request) {
        return adminService.broadcastNotification(request.getTitle(), request.getBody());
    }
}
