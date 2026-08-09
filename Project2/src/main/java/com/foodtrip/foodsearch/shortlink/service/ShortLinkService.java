package com.foodtrip.foodsearch.shortlink.service;

public interface ShortLinkService {

    // path 예: "explore?shopId=1722362250&name=..." — 우리 사이트 내부 상대 경로만 허용한다.
    String createOrReuse(String path);

    // code에 대응하는 원래 경로를 돌려준다. 없거나 만료됐으면 예외(ErrorCode.SHORT_LINK_NOT_FOUND).
    String resolve(String code);
}
