package com.foodtrip.foodsearch.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 19(오픈채팅) — 16(리뷰-신고)의 ReviewReport와 같은 상태 모델(PENDING/RESOLVED/REJECTED)을 그대로
// 재사용하되, 신고 대상이 "채팅방 전체"일 수도 "메시지 하나"일 수도 있어 targetType으로 구분한다
// (001-02 2-3장). chatMessageId가 null이면 방 전체 신고, 값이 있으면 메시지 신고 - 메시지 신고여도
// chatRoomId는 항상 채워진다(그 메시지가 속한 방, 관리자 화면에서 방 제목을 같이 보여주기 위함).
// reportedContentSnapshot은 신고 시점의 메시지 내용을 복사해둔 것 - 방이 나중에 폭파(ChatRoom.explode())
// 되어 원본 chat_messages 행이 삭제돼도 신고 증거가 남도록 함(회원정보수정/마이페이지의 "이름 스냅샷"
// 패턴과 같은 이유).
@Entity
@Table(name = "chat_reports")
public class ChatReport {

    public static final String TARGET_ROOM = "ROOM";
    public static final String TARGET_MESSAGE = "MESSAGE";

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_RESOLVED = "RESOLVED";
    public static final String STATUS_REJECTED = "REJECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_report_id")
    private Long chatReportId;

    @Column(name = "target_type", nullable = false, length = 10)
    private String targetType;

    @Column(name = "chat_room_id", nullable = false)
    private Long chatRoomId;

    @Column(name = "chat_message_id")
    private Long chatMessageId;

    @Column(name = "reporter_member_id", nullable = false)
    private Long reporterMemberId;

    @Column(name = "reason_code", nullable = false, length = 30)
    private String reasonCode;

    @Column(name = "detail", length = 500)
    private String detail;

    @Column(name = "reported_content_snapshot", length = 1000)
    private String reportedContentSnapshot;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    protected ChatReport() {
    }

    public static ChatReport createRoomReport(Long chatRoomId, Long reporterMemberId, String reasonCode,
                                               String detail) {
        ChatReport report = new ChatReport();
        report.targetType = TARGET_ROOM;
        report.chatRoomId = chatRoomId;
        report.chatMessageId = null;
        report.reporterMemberId = reporterMemberId;
        report.reasonCode = reasonCode;
        report.detail = detail;
        report.status = STATUS_PENDING;
        return report;
    }

    public static ChatReport createMessageReport(Long chatRoomId, Long chatMessageId, Long reporterMemberId,
                                                  String reasonCode, String detail, String contentSnapshot) {
        ChatReport report = new ChatReport();
        report.targetType = TARGET_MESSAGE;
        report.chatRoomId = chatRoomId;
        report.chatMessageId = chatMessageId;
        report.reporterMemberId = reporterMemberId;
        report.reasonCode = reasonCode;
        report.detail = detail;
        report.reportedContentSnapshot = contentSnapshot;
        report.status = STATUS_PENDING;
        return report;
    }

    public void resolve() {
        this.status = STATUS_RESOLVED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void reject() {
        this.status = STATUS_REJECTED;
        this.resolvedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getChatReportId() {
        return chatReportId;
    }

    public String getTargetType() {
        return targetType;
    }

    public Long getChatRoomId() {
        return chatRoomId;
    }

    public Long getChatMessageId() {
        return chatMessageId;
    }

    public Long getReporterMemberId() {
        return reporterMemberId;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public String getDetail() {
        return detail;
    }

    public String getReportedContentSnapshot() {
        return reportedContentSnapshot;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }
}
