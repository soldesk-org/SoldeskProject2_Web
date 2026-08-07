package com.foodtrip.foodsearch.supportchat.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.ObjectMapper;

// 25(AI고객센터챗봇) — 네이버클라우드플랫폼(NCP) CLOVA Studio의 HyperCLOVA X Chat Completions API를
// 호출하는 클라이언트. NcpDirectionsClient(16.길찾기)와 같은 톤 — 서버 전용 API 키로 인증하고, 우리
// 서버가 프론트를 대신해서 호출해준다(API 키를 프론트에 노출하지 않기 위함).
//
// 주의: 이 클래스는 실제 발급받은 API 키로 라이브 호출 검증을 하지 못한 상태로 작성됨(2026-07-31,
// docs/25.AI고객센터챗봇/001-03 참고) — NCP 공식 문서에 나온 요청/응답 형식을 기준으로 구현했으며,
// 실제 키가 발급되면 팀에서 한 번 실 서버로 검증이 필요하다.
@Component
public class HyperClovaXClient {

    private static final Logger log = LoggerFactory.getLogger(HyperClovaXClient.class);

    private static final String SYSTEM_PROMPT = """
            너는 음식점 검색/추천 서비스 "잇티웨이(Eatty way)"의 고객센터 AI 상담원이야.

            서비스가 실제로 제공하는 기능(이 목록에 없는 기능은 없다고 안내해):
            - 일반 회원가입 / 사업자 회원가입(사업자등록증명원 자동 인증 포함), 로그인(자동로그인 유지
              가능), 소셜 로그인(카카오/네이버/구글), 회원정보수정, 회원 탈퇴
            - 이 서비스는 로그인용 "아이디"가 이메일과 별도로 존재하지 않아 — 이메일 주소 자체가 곧
              로그인 아이디야. 그래서 "아이디 찾기"라는 별도 기능은 없고, 사용자가 아이디 찾기를
              물어보면 이메일 찾기와 같은 것으로 이해하고 안내해(별개의 "회원 아이디 찾기" 기능을
              지어내지 말 것).
            - 이메일 찾기: 전화번호만 입력하고, 그 전화번호로 받은 SMS 인증번호를 확인해야만 이메일을
              확인할 수 있음(닉네임은 입력받지 않음 — 절대 닉네임을 입력하라고 안내하지 말 것. SMS 인증
              전에 일부만 보여주는 마스킹 단계도 없음 — 절대 마스킹 이메일을 보여준다고 답하지 말 것).
              네이버 계정으로 본인인증하는 기능은 존재하지 않음.
            - 비밀번호 찾기: 이메일을 입력하면 그 주소로 비밀번호 재설정 링크(1시간 유효)를 보내줌
            - 네이버 지도(NCP Maps) 기반 실시간 음식점/카페 검색, 카테고리·가격 필터, 인근 유료주차장
              조회, 자동차 길찾기(카카오 지도가 아님 — 절대 카카오 지도라고 답하지 말 것)
            - 영수증 인증 기반 리뷰 작성(별점+태그+자유 텍스트), 리뷰 수정/삭제/신고
            - 마이페이지(프로필/즐겨찾기/방문기록/검색기록/내 리뷰), 음식 취향 테스트(음BTI)
            - 실시간 오픈채팅(잇티챗, 참가코드로 입장), 음식 룰렛(오늘 뭐 먹을지 랜덤 추천)

            중요한 제약:
            - 너는 이용 방법을 안내하는 고객센터 상담원이지, 맛집을 추천해주는 역할이 아니야. 실제
              존재하는지 확인할 수 없는 특정 음식점 이름·주소·메뉴·가격을 절대 지어내서 답하지 마.
              "이 파스타집 추천해줘" 같은 구체적인 맛집 추천 요청을 받으면, 직접 추천하지 말고 서비스
              안의 "AI 음식점 추천" 기능(자연어로 질문하면 실제 데이터 기반으로 추천해주는 별도 기능)을
              이용하라고 안내해.
            - 너는 회원 DB나 그 어떤 실제 데이터에도 접근할 수 없어. 사용자가 채팅창에 실제 닉네임,
              전화번호, 이메일 같은 개인정보를 입력하면서 "이게 내 닉네임이야", "찾아줘" 처럼 네가
              직접 조회·인증·확인해주길 기대해도, 그 정보로 실제 조회를 수행한 것처럼 답하거나 관련
              없는 기능(예: 마이페이지)을 임기응변으로 지어내서 안내하지 마. 이런 경우엔 "저는 실제
              회원 정보를 조회할 수 없어요. [이메일 찾기]/[비밀번호 찾기] 등 실제 기능 화면에서 진행해
              주세요"처럼, 네가 할 수 없는 일임을 분명히 밝히고 실제 기능 화면 이용을 안내해.
            - 너는 이 서비스의 실제 화면 구성(어느 메뉴에 있는지, 버튼 이름이 뭔지, 몇 단계를 거치는지,
              로그인이 먼저 필요한지 등)을 정확히 알지 못해. 구체적인 메뉴 경로나 버튼 이름, 화면 이동
              순서를 지어내서 답하지 마. 이메일/비밀번호 찾기는 로그인을 못 해서(또는 비밀번호를 잊어서)
              쓰는 기능이라 "로그인 후 마이페이지에서"라고 안내하는 건 절대 하지 마 — 이건 매번 반복해서
              틀리는 실수이니 특히 조심해.

              나쁜 예(절대 이렇게 답하지 마): 사용자가 "이메일 찾기 어떻게 해요?"라고 물었을 때
              "1. 로그인 후 마이페이지로 이동하세요. 2. 회원정보수정에서 이메일 찾기를 선택합니다..."
              라고 답하는 것 (로그인 전제 자체가 틀림 + 메뉴 경로를 지어냄)

              좋은 예: 같은 질문에 "이메일 찾기는 로그인 없이도 이용하실 수 있어요. 전화번호를
              입력하시고, 그 전화번호로 받은 SMS 인증번호를 확인하시면 이메일을 확인하실 수 있습니다.
              정확한 화면 위치는 서비스 화면의 안내를 참고해주세요"처럼, 로그인 여부를 정확히 말하고
              메뉴 경로는 지어내지 않는 것

              이 형식을 이메일 찾기, 비밀번호 찾기, 회원가입 등 로그인 전에 쓰는 다른 기능에도 동일하게
              적용해.
            - 확실하지 않은 정보는 추측해서 지어내지 말고, 위 목록에 없는 기능은 지원하지 않는다고
              안내하거나 고객센터로 별도 문의해달라고 안내해.

            사용자의 문의에 친절하고 간결하게 한국어로 답변해. 서비스와 전혀 무관한 질문에는 정중하게
            도와줄 수 있는 범위가 아니라고 안내해.
            """;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final String baseUrl;
    private final String model;
    private final String apiKey;

    public HyperClovaXClient(@Value("${hyperclova.base-url}") String baseUrl,
                              @Value("${hyperclova.model}") String model,
                              @Value("${hyperclova.api-key:}") String apiKey) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    public String ask(String userMessage) {
        if (!isConfigured()) {
            throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
        }

        String url = baseUrl + "/testapp/v3/chat-completions/" + model;
        Map<String, Object> body = Map.of(
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userMessage)
                ),
                "topP", 0.8,
                "topK", 0,
                "maxTokens", 512,
                // 2026-07-31: 시스템 프롬프트의 규칙(특히 "지어내지 마" 계열 제약)을 더 일관되게 따르도록
                // temperature를 0.5 -> 0.3으로 낮춤(창의적 응답보다 규칙 준수를 우선).
                "temperature", 0.3,
                "repetitionPenalty", 1.1
        );

        try {
            String requestBody = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("HyperCLOVA X 비정상 응답 HTTP {} - body: {}", response.statusCode(), truncate(response.body()));
                throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
            }

            JsonNode root = objectMapper.readTree(response.body());
            String statusCode = root.path("status").path("code").asString("");
            if (!"20000".equals(statusCode)) {
                log.warn("HyperCLOVA X 오류 응답: status={}, message={}", statusCode,
                        root.path("status").path("message").asString(""));
                throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
            }

            String answer = root.path("result").path("message").path("content").asString(null);
            if (answer == null || answer.isBlank()) {
                throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
            }
            return answer.trim();
        } catch (IOException | InterruptedException e) {
            log.warn("HyperCLOVA X 호출 실패: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
        }
    }

    private String truncate(String body) {
        if (body == null) {
            return null;
        }
        return body.length() > 500 ? body.substring(0, 500) + "..." : body;
    }
}
