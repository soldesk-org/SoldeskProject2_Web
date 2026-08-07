package com.foodtrip.foodsearch.notification.dto;

import java.time.LocalDateTime;

// 필드명을 eatty-ui.js Eatty.notify.setItems()가 그대로 받아들이는 키(id/type/title/body/link/read/at)에
// 맞췄다 — 프론트에서 별도 매핑 없이 API 응답을 그대로 넘길 수 있도록.
public class NotificationResponseDto {

    private final Long id;
    private final String type;
    private final String title;
    private final String body;
    private final String link;
    private final boolean read;
    private final LocalDateTime at;

    public NotificationResponseDto(Long id, String type, String title, String body, String link, boolean read,
                                    LocalDateTime at) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.body = body;
        this.link = link;
        this.read = read;
        this.at = at;
    }

    public Long getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getLink() {
        return link;
    }

    public boolean isRead() {
        return read;
    }

    public LocalDateTime getAt() {
        return at;
    }
}
