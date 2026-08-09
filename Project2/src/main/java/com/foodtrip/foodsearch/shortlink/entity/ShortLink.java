package com.foodtrip.foodsearch.shortlink.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// 단축 URL(2026-08-09 추가) — 음식점/추천 공유 링크가 shopId/name/category/address/latitude/longitude를
// 전부 쿼리스트링에 실어보내 너무 길어진다는 지적으로 도입. code(짧은 무작위 문자열) -> targetPath(원래
// 우리 사이트 안의 상대 경로, 예: "explore?shopId=...") 매핑만 저장하고, GET /s/{code}가 그 경로로
// 302 리다이렉트한다(ShortLinkController 참고). targetPath는 반드시 우리 사이트 내부 상대 경로만 허용하고
// (ShortLinkServiceImpl.validateTargetPath) 외부 URL은 절대 저장하지 않는다 — 오픈 리다이렉트 방지.
@Entity
@Table(name = "short_links", uniqueConstraints = @UniqueConstraint(columnNames = "code"))
public class ShortLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "short_link_id")
    private Long shortLinkId;

    @Column(name = "code", nullable = false, length = 12)
    private String code;

    @Column(name = "target_path", nullable = false, length = 500)
    private String targetPath;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ShortLink() {
    }

    public static ShortLink create(String code, String targetPath) {
        ShortLink link = new ShortLink();
        link.code = code;
        link.targetPath = targetPath;
        return link;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getShortLinkId() {
        return shortLinkId;
    }

    public String getCode() {
        return code;
    }

    public String getTargetPath() {
        return targetPath;
    }
}
