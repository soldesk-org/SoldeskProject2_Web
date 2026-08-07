package com.foodtrip.foodsearch.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.notification.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop50ByMemberIdOrderByCreatedAtDesc(Long memberId);

    List<Notification> findTop50ByMemberIdAndIsReadFalseOrderByCreatedAtDesc(Long memberId);

    long countByMemberIdAndIsReadFalse(Long memberId);

    Optional<Notification> findByNotificationIdAndMemberId(Long notificationId, Long memberId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.memberId = :memberId AND n.isRead = false")
    void markAllRead(@Param("memberId") Long memberId);
}
