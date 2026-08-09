package com.foodtrip.foodsearch.shortlink.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.shortlink.entity.ShortLink;

public interface ShortLinkRepository extends JpaRepository<ShortLink, Long> {

    Optional<ShortLink> findByCode(String code);

    // 같은 경로를 여러 번 공유해도 매번 새 코드를 만들지 않고 기존 코드를 재사용한다(불필요한 행 증가 방지).
    Optional<ShortLink> findFirstByTargetPath(String targetPath);

    boolean existsByCode(String code);
}
