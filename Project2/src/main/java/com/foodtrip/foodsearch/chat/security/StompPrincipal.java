package com.foodtrip.foodsearch.chat.security;

import java.security.Principal;

// STOMP 세션에 회원을 식별할 Principal이 필요해서 만든 최소 구현체 - getName()이 memberId 문자열을
// 그대로 반환한다. convertAndSendToUser(memberId, ...)로 특정 회원에게만 보내는 에러 알림(001-02 2-6장,
// 클린봇에 걸리면 본인에게만 알림) 등에 이 이름이 그대로 쓰인다.
public class StompPrincipal implements Principal {

    private final String memberId;

    public StompPrincipal(String memberId) {
        this.memberId = memberId;
    }

    @Override
    public String getName() {
        return memberId;
    }
}
