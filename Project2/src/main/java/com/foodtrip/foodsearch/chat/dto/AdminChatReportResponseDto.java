package com.foodtrip.foodsearch.chat.dto;

import java.time.LocalDateTime;

// 16(리뷰-신고)의 AdminReportedReviewResponseDto와 달리 "대상별로 묶지" 않고 신고 1건 = 1행으로 그대로
// 보여준다(001-02 2-9장 - 오픈채팅은 아직 신고 볼륨이 낮을 것으로 예상돼 굳이 리뷰처럼 그룹핑할 필요가
// 없다고 판단, 필요해지면 나중에 리뷰와 같은 방식으로 바꿀 수 있음).
public class AdminChatReportResponseDto {

    private final Long chatReportId;
    private final String targetType;
    private final Long chatRoomId;
    private final String roomTitle;
    private final Long chatMessageId;
    private final String reporterNickname;
    private final String reasonCode;
    private final String detail;
    private final String contentSnapshot;
    private final String status;
    private final LocalDateTime createdAt;

    public AdminChatReportResponseDto(Long chatReportId, String targetType, Long chatRoomId, String roomTitle,
                                       Long chatMessageId, String reporterNickname, String reasonCode,
                                       String detail, String contentSnapshot, String status,
                                       LocalDateTime createdAt) {
        this.chatReportId = chatReportId;
        this.targetType = targetType;
        this.chatRoomId = chatRoomId;
        this.roomTitle = roomTitle;
        this.chatMessageId = chatMessageId;
        this.reporterNickname = reporterNickname;
        this.reasonCode = reasonCode;
        this.detail = detail;
        this.contentSnapshot = contentSnapshot;
        this.status = status;
        this.createdAt = createdAt;
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

    public String getRoomTitle() {
        return roomTitle;
    }

    public Long getChatMessageId() {
        return chatMessageId;
    }

    public String getReporterNickname() {
        return reporterNickname;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public String getDetail() {
        return detail;
    }

    public String getContentSnapshot() {
        return contentSnapshot;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
