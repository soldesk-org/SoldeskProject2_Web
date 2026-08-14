package com.foodtrip.foodsearch.geocode.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

// 사업자 회원가입 STEP2 주소 검색(2026-08-04) — 행정안전부 도로명주소 팝업 API(resultType=4)는
// 주소를 선택하면 opener의 JS 함수를 cross-origin으로 바로 호출하는 게 아니라, 팝업 자신을
// returnUrl로 POST 이동시킨다(실사용 중 발견 — 최초 설계 당시엔 opener.jusoCallBack()을 cross-origin
// 에서 직접 부를 수 있을 거라 가정했지만, 브라우저가 커스텀 함수 프로퍼티의 cross-origin 접근 자체를
// 막아서 실패함). 그래서 returnUrl을 이 전용 엔드포인트로 지정해서, 서버가 POST로 넘어온 주소 필드를
// 받아 "opener.jusoCallBack(...)을 호출하고 창을 닫는" 아주 작은 HTML을 내려준다 — 이 페이지는 팝업과
// 같은 origin(localhost:8081 등)이라, opener(원래 탭)의 함수를 정상적으로 호출할 수 있다.
@Controller
public class JusoCallbackController {

    @PostMapping(value = "/api/juso-callbacks", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callback(@RequestParam(defaultValue = "") String roadFullAddr,
                                            @RequestParam(defaultValue = "") String roadAddrPart1,
                                            @RequestParam(defaultValue = "") String addrDetail,
                                            @RequestParam(defaultValue = "") String roadAddrPart2,
                                            @RequestParam(defaultValue = "") String engAddr,
                                            @RequestParam(defaultValue = "") String jibunAddr,
                                            @RequestParam(defaultValue = "") String zipNo) {
        String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body>"
                + "<script>"
                + "if (window.opener && typeof window.opener.jusoCallBack === 'function') {"
                + "  window.opener.jusoCallBack("
                + jsString(roadFullAddr) + "," + jsString(roadAddrPart1) + "," + jsString(addrDetail) + ","
                + jsString(roadAddrPart2) + "," + jsString(engAddr) + "," + jsString(jibunAddr) + "," + jsString(zipNo)
                + ");"
                + "}"
                + "window.close();"
                + "</script>"
                + "</body></html>";
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    // opener.jusoCallBack(...) 호출부에 그대로 삽입할 수 있도록 값을 JS 문자열 리터럴로 안전하게
    // 이스케이프한다. HTML 이스케이프가 아니라 JS 문자열 이스케이프가 필요하다(<script> 안에 들어갈
    // 값이지 HTML 본문 텍스트가 아니라서, HTML 엔티티로 바꾸면 실제 주소 문자열이 깨진다). "</"는
    // </script>로 파싱되어 스크립트가 조기 종료되는 걸 막기 위해 별도로 이스케이프한다.
    private String jsString(String value) {
        String v = value == null ? "" : value;
        String escaped = v.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\r", "")
                .replace("\n", "\\n")
                .replace("</", "<\\/");
        return "'" + escaped + "'";
    }
}
