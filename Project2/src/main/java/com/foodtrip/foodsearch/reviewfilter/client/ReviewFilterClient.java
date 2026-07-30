package com.foodtrip.foodsearch.reviewfilter.client;

import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.reviewfilter.filter.KorcenProfanityFilter;

// 리뷰/채팅 욕설·비속어 필터(17.리뷰-필터링, 2026-07-24 추가) — 원래는 별도 Python(FastAPI) 서버
// (SoldeskProject2_Python/review-filter, korcen 라이브러리)를 호출하는 구조였으나, Python 프로세스를
// 따로 띄워야 하는 의존성을 없애기 위해 2026-07-30에 korcen의 판정 로직 자체를 Java로 이식
// (KorcenProfanityFilter)해서 순수 인프로세스 호출로 교체했다. 클래스명/메서드 시그니처는 그대로 유지해서
// 이 클래스를 주입받는 ReviewServiceImpl/ChatMessageServiceImpl은 수정할 필요가 없게 했다.
@Component
public class ReviewFilterClient {

    public boolean containsProfanity(String text) {
        return KorcenProfanityFilter.containsProfanity(text);
    }
}
