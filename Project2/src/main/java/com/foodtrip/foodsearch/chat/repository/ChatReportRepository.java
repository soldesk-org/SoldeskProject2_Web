package com.foodtrip.foodsearch.chat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.chat.entity.ChatReport;

public interface ChatReportRepository extends JpaRepository<ChatReport, Long> {

    // chatMessageId가 null일 수 있어(방 전체 신고) DB UNIQUE 제약으로는 중복을 못 막는다(MariaDB는 NULL을
    // 서로 다른 값으로 취급) - 그래서 애플리케이션 레벨에서 이 두 메서드로 직접 중복 여부를 확인한다
    // (001-02 2-5장).
    boolean existsByReporterMemberIdAndChatRoomIdAndTargetTypeAndChatMessageIdIsNull(Long reporterMemberId,
                                                                                      Long chatRoomId,
                                                                                      String targetType);

    boolean existsByReporterMemberIdAndChatMessageId(Long reporterMemberId, Long chatMessageId);

    List<ChatReport> findByStatusOrderByCreatedAtDesc(String status);
}
