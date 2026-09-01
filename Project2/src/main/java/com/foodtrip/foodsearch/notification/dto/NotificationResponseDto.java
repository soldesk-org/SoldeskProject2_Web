package com.foodtrip.foodsearch.notification.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

// 필드명을 eatty-ui.js Eatty.notify.setItems()가 그대로 받아들이는 키(id/type/title/body/link/read/at)에
// 맞췄다 — 프론트에서 별도 매핑 없이 API 응답을 그대로 넘길 수 있도록.
//
// 2026-08-22 수정 — "9시간 전"으로 잘못 표시되는 버그(정확히 KST 시차만큼 어긋남) 발견. at 필드에
// @JsonFormat을 안 줘서 Jackson이 LocalDateTime을 배열([2026,8,22,22,35,10])로 직렬화하고 있었고,
// eatty-ui.js의 new Date(n.at)가 그 배열을 의도치 않은 방식으로 파싱해 엉뚱한 시각이 됐다. 명시적으로
// ISO 문자열(zone 표시 없음 = 로컬시간으로 해석됨)로 고정해서 프론트가 항상 같은 형식을 받게 한다.
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

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    public LocalDateTime getAt() {
        return at;
    }
}
