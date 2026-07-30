package com.foodtrip.foodsearch.chat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.chat.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // 최근 순으로 최대 50건만 가져온 뒤(001-02 2-7장, 페이지네이션 없이 최근 대화만 보여주는 단순한 범위),
    // 화면에는 오래된 순으로 보여줘야 하므로 서비스 계층에서 뒤집는다.
    List<ChatMessage> findTop50ByChatRoomIdOrderByCreatedAtDesc(Long chatRoomId);

    void deleteByChatRoomId(Long chatRoomId);
}
