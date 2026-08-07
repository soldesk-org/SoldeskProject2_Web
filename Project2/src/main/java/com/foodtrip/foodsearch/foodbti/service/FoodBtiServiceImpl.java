package com.foodtrip.foodsearch.foodbti.service;

import java.text.Collator;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiAnswerRequestDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiChoiceDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiQuestionDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiResultResponseDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiScoreDto;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 음BTI(음식 취향 MBTI) — 다른 팀원(SoldeskProject2_Web_MBTI 저장소, feature/web-map-responsive 브랜치)이
// 만들어둔 질문/채점 로직을 이 프로젝트의 실제 회원 도메인에 연동. 계산 로직 자체(질문 12개, 4개 성향축)는
// 원본 그대로 포팅했고, 로그인 상태로 호출하면 결과를 members.food_bti에 실제로 저장하는 부분만 새로 추가.
//
// 2026-08-06 후속 - 처음 포팅할 때는 팀원의 원본 저장소에 16개 유형 전체의 이름/설명/추천메뉴가 있는지
// 모르고 2개 유형(SNTP/LFAI)만 수동으로 옮기고 나머지 14개는 이 프로젝트에서 즉석으로 조합 생성했었다.
// 이후 같은 feature/web-map-responsive 브랜치의 FOOD_BTI_INTERACTIVE_DEMO.svg(인터랙티브 데모, <script>
// 안에 순수 JS로 문항/16개 유형 프로필/32개 메뉴 추천 데이터와 채점 로직이 전부 들어있음)를 확인해보니
// 원본에 16개 유형 전체가 다 있었다 - 그 데이터 그대로 포팅해서 교체한다. 화면(taste-quiz.html/js)은
// 그대로 두고 이 서비스가 반환하는 내용만 원본과 일치시킨다.
@Service
public class FoodBtiServiceImpl implements FoodBtiService {

    // 유형 코드(L/S × F/N × A/T × P/I) -> [유형 이름, 설명]. 4개 축의 모든 조합(2^4=16개)을 다 담고
    // 있어 calculateType()이 만들어내는 어떤 코드로 조회해도 항상 값이 있다(fallback 불필요).
    private static final Map<String, String[]> PROFILES = Map.ofEntries(
            Map.entry("LFAP", new String[]{"차분한 단골 설계자", "담백하고 익숙한 메뉴를 선호하며, 혼자 먹을 식당도 미리 꼼꼼하게 알아보는 유형입니다."}),
            Map.entry("LFAI", new String[]{"담백한 혼밥러", "익숙하고 부담 없는 음식을 혼자 편안하게 즐기며, 그날 기분에 따라 가볍게 선택하는 유형입니다."}),
            Map.entry("LFTP", new String[]{"정겨운 맛집 리더", "편안하고 검증된 메뉴를 사람들과 함께 즐기며, 식사 장소를 미리 정해두는 유형입니다."}),
            Map.entry("LFTI", new String[]{"편안한 번개 식객", "익숙하고 담백한 음식을 좋아하며, 사람들과 즉흥적으로 식사 약속을 잡는 유형입니다."}),
            Map.entry("LNAP", new String[]{"꼼꼼한 메뉴 개척자", "부담 없는 맛을 선호하면서도 새로운 메뉴를 탐색하고, 혼자만의 미식 계획을 세우는 유형입니다."}),
            Map.entry("LNAI", new String[]{"조용한 맛 탐험가", "담백한 새 메뉴를 발견하면 혼자서도 가볍게 도전하는 자유로운 유형입니다."}),
            Map.entry("LNTP", new String[]{"계획형 푸드 큐레이터", "새롭고 섬세한 맛을 찾아 사람들과 나누며, 방문할 식당과 메뉴를 미리 조사하는 유형입니다."}),
            Map.entry("LNTI", new String[]{"함께 떠나는 맛 모험가", "부담 없는 새로운 음식을 좋아하고, 사람들과 즉흥적인 미식 경험을 즐기는 유형입니다."}),
            Map.entry("SFAP", new String[]{"매운맛 단골 전략가", "강한 맛의 익숙한 메뉴를 선호하며, 혼자 먹을 때도 검증된 식당을 미리 찾아보는 유형입니다."}),
            Map.entry("SFAI", new String[]{"화끈한 혼밥 직진러", "익숙하고 자극적인 음식이 생각나면 혼자라도 바로 먹으러 가는 유형입니다."}),
            Map.entry("SFTP", new String[]{"검증된 회식 대장", "강렬하고 익숙한 메뉴를 사람들과 즐기며, 실패 없는 식사 자리를 계획하는 유형입니다."}),
            Map.entry("SFTI", new String[]{"즉흥 야식 파티원", "익숙한 강한 맛을 좋아하고, 사람들과 갑자기 잡힌 식사나 야식을 즐기는 유형입니다."}),
            Map.entry("SNAP", new String[]{"치밀한 강맛 개척자", "자극적인 새로운 메뉴를 혼자서도 탐색하며, 도전할 식당을 미리 조사하는 유형입니다."}),
            Map.entry("SNAI", new String[]{"혼자 떠나는 매운 모험가", "강렬하고 낯선 음식도 망설이지 않고 혼자 즉흥적으로 도전하는 유형입니다."}),
            Map.entry("SNTP", new String[]{"매운맛 탐험가", "강렬한 맛과 새로운 음식을 좋아하며, 사람들과 함께 새로운 맛집을 계획해 찾아다니는 유형입니다."}),
            Map.entry("SNTI", new String[]{"번개 미식 원정대장", "새롭고 강한 맛을 찾아 사람들과 즉흥적으로 움직이는 활발한 유형입니다."}));

    // 메뉴 이름 -> 어느 4개 축 문자에 잘 맞는지(예: "LFAP" = L+F+A+P 성향에 잘 맞는 메뉴). 유형별 2개씩
    // 총 32개. 결과 화면의 "추천 메뉴"는 최종 유형 하나로 고정하지 않고, 회원이 실제로 고른 답변 점수
    // (L/S/F/N/A/T/P/I 각 0~3점) 기준으로 이 32개 전체를 채점해 상위 5개를 보여준다(원본 데모와 동일한
    // recommendFoods 로직 - 최종 유형이 같아도 세부 답변 성향에 따라 추천이 조금씩 달라진다).
    private static final String[][] FOOD_CANDIDATES = {
            {"칼국수", "LFAP"}, {"백반", "LFAP"},
            {"국밥", "LFAI"}, {"김밥", "LFAI"},
            {"샤브샤브", "LFTP"}, {"한정식", "LFTP"},
            {"보쌈", "LFTI"}, {"만두전골", "LFTI"},
            {"포케", "LNAP"}, {"오차즈케", "LNAP"},
            {"쌀국수", "LNAI"}, {"후무스볼", "LNAI"},
            {"딤섬", "LNTP"}, {"스페인 타파스", "LNTP"},
            {"반쎄오", "LNTI"}, {"월남쌈", "LNTI"},
            {"제육덮밥", "SFAP"}, {"매운 돈가스", "SFAP"},
            {"떡볶이", "SFAI"}, {"매운 라면", "SFAI"},
            {"닭갈비", "SFTP"}, {"부대찌개", "SFTP"},
            {"삼겹살", "SFTI"}, {"곱창", "SFTI"},
            {"탄탄면", "SNAP"}, {"인도 커리", "SNAP"},
            {"마라샹궈", "SNAI"}, {"매운 쌀국수", "SNAI"},
            {"마라탕", "SNTP"}, {"쭈꾸미", "SNTP"},
            {"닭발", "SNTI"}, {"멕시칸 타코", "SNTI"},
    };

    private final MemberRepository memberRepository;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public FoodBtiServiceImpl(MemberRepository memberRepository,
                               JwtProvider jwtProvider,
                               AccessTokenSessionService accessTokenSessionService) {
        this.memberRepository = memberRepository;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    public List<FoodBtiQuestionDto> getQuestions() {
        List<FoodBtiQuestionDto> questions = new ArrayList<>();

        // 첫번째 성향 - L : 담백한 맛 / S : 자극적인 맛
        questions.add(new FoodBtiQuestionDto(1, "음식을 먹을 때 더 끌리는 맛은?",
                new FoodBtiChoiceDto("재료 본연의 담백하고 깔끔한 맛.", "L"),
                new FoodBtiChoiceDto("맵고 짜고 양념이 강한 자극적인 맛.", "S")));
        questions.add(new FoodBtiQuestionDto(2, "스트레스 받는 날 먹고 싶은 음식은?",
                new FoodBtiChoiceDto("따뜻하고 편한 국물이나 집밥.", "L"),
                new FoodBtiChoiceDto("매운 음식이나 양념이 강한 음식.", "S")));
        questions.add(new FoodBtiQuestionDto(3, "야식으로 더 먹고 싶은 음식은?",
                new FoodBtiChoiceDto("샌드위치, 죽, 샐러드처럼 부담 없고 부드러운 음식.", "L"),
                new FoodBtiChoiceDto("닭발, 떡볶이, 마라탕처럼 강렬한 음식.", "S")));

        // 두번째 성향 - F : 익숙한 음식 / N : 새로운 음식
        questions.add(new FoodBtiQuestionDto(4, "해외여행에서 현지 음식을 발견한다면?",
                new FoodBtiChoiceDto("조금이라도 알고 있는 무난한 음식을 찾는다.", "F"),
                new FoodBtiChoiceDto("현지에서만 먹을 수 있는 음식에 도전한다.", "N")));
        questions.add(new FoodBtiQuestionDto(5, "자주 가는 맛집이 생겼을 때 나는?",
                new FoodBtiChoiceDto("마음에 들었던 메뉴를 계속 주문한다.", "F"),
                new FoodBtiChoiceDto("다른 메뉴를 골라가며 먹어본다.", "N")));
        questions.add(new FoodBtiQuestionDto(6, "처음 방문한 식당에서 메뉴를 고를 때 나는?",
                new FoodBtiChoiceDto("익숙한 메뉴를 선택한다.", "F"),
                new FoodBtiChoiceDto("처음 보는 메뉴에 도전해본다.", "N")));

        // 세번째 성향 - A : 혼자먹기 / T : 함께 먹기
        questions.add(new FoodBtiQuestionDto(7, "맛있는 음식이 생각났을 때 나는?",
                new FoodBtiChoiceDto("혼자 바로 먹으러 간다.", "A"),
                new FoodBtiChoiceDto("같이 먹으러 갈 사람을 먼저 찾는다.", "T")));
        questions.add(new FoodBtiQuestionDto(8, "밥을 먹을 때 선호하는 분위기는?",
                new FoodBtiChoiceDto("혼자 조용하고 편하게 먹는 분위기.", "A"),
                new FoodBtiChoiceDto("친구 또는 지인과 이야기하며 먹는 분위기.", "T")));
        questions.add(new FoodBtiQuestionDto(9, "길을 가다 새로운 맛집을 발견했을 때 나는?",
                new FoodBtiChoiceDto("내 일정에 맞춰 혼자 방문한다.", "A"),
                new FoodBtiChoiceDto("친구와 공유하고 함께 방문한다.", "T")));

        // 네번째 성향 - P : 계획적으로 선택 / I : 즉흥적으로 선택
        questions.add(new FoodBtiQuestionDto(10, "식당에 방문하기 전 나는?",
                new FoodBtiChoiceDto("메뉴, 가격, 리뷰를 미리 확인한다.", "P"),
                new FoodBtiChoiceDto("일단 방문해서 끌리는 메뉴를 선택한다.", "I")));
        questions.add(new FoodBtiQuestionDto(11, "주말 외식 장소를 정할 때 나는?",
                new FoodBtiChoiceDto("며칠 전부터 식당을 검색하고 정한다.", "P"),
                new FoodBtiChoiceDto("당일 먹고 싶은 메뉴를 선택한다.", "I")));
        questions.add(new FoodBtiQuestionDto(12, "식당에 웨이팅이 길게 있다면 나는?",
                new FoodBtiChoiceDto("미리 찾아둔 다음 식당으로 이동한다.", "P"),
                new FoodBtiChoiceDto("주변을 둘러보다 눈에 띄는 식당으로 들어간다.", "I")));

        return questions;
    }

    @Override
    @Transactional
    public FoodBtiResultResponseDto calculateResult(String authorizationHeader, FoodBtiAnswerRequestDto request) {
        List<String> answers = request.getAnswers();

        int l = 0, s = 0, f = 0, n = 0, a = 0, t = 0, p = 0, i = 0;
        for (String answer : answers) {
            if (answer == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            switch (answer.toUpperCase()) {
                case "L": l++; break;
                case "S": s++; break;
                case "F": f++; break;
                case "N": n++; break;
                case "A": a++; break;
                case "T": t++; break;
                case "P": p++; break;
                case "I": i++; break;
                default: throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        }

        String resultType = ""
                + (l >= s ? "L" : "S")
                + (f >= n ? "F" : "N")
                + (a >= t ? "A" : "T")
                + (p >= i ? "P" : "I");

        FoodBtiScoreDto score = new FoodBtiScoreDto(l, s, f, n, a, t, p, i);

        // 로그인 상태면(선택) 계산 결과를 회원 정보에 실제로 저장한다 — 비로그인이면 결과 계산만 하고
        // 저장은 건너뛴다(질문 목록과 마찬가지로 로그인 없이도 테스트 삼아 풀어볼 수 있어야 하므로).
        boolean saved = false;
        Long memberId = resolveMemberIdOrNull(authorizationHeader);
        if (memberId != null) {
            Member member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));
            member.updateFoodBti(resultType, encodeScore(score));
            saved = true;
        }

        return createResult(resultType, score, saved);
    }

    @Override
    public FoodBtiResultResponseDto getMyResult(String authorizationHeader) {
        Long memberId = resolveMemberIdOrNull(authorizationHeader);
        if (memberId == null) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));
        if (member.getFoodBti() == null || member.getFoodBtiScore() == null) {
            throw new CustomException(ErrorCode.FOOD_BTI_RESULT_NOT_FOUND);
        }
        return createResult(member.getFoodBti(), decodeScore(member.getFoodBtiScore()), true);
    }

    // "l:s:f:n:a:t:p:i" 형식(Member.foodBtiScore 컬럼 주석 참고).
    private String encodeScore(FoodBtiScoreDto score) {
        return score.getL() + ":" + score.getS() + ":" + score.getF() + ":" + score.getN() + ":"
                + score.getA() + ":" + score.getT() + ":" + score.getP() + ":" + score.getI();
    }

    private FoodBtiScoreDto decodeScore(String encoded) {
        String[] parts = encoded.split(":");
        int[] v = new int[8];
        for (int idx = 0; idx < 8; idx++) {
            v[idx] = Integer.parseInt(parts[idx]);
        }
        return new FoodBtiScoreDto(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7]);
    }

    private FoodBtiResultResponseDto createResult(String resultType, FoodBtiScoreDto score, boolean saved) {
        String[] profile = PROFILES.get(resultType);
        return new FoodBtiResultResponseDto(resultType, profile[0], profile[1], recommendFoods(score), score, saved);
    }

    // 원본 데모의 calculateRecommendations()와 동일한 방식 - 메뉴마다 태그(예: "LFAP")를 이루는 4개
    // 문자 각각의 답변 점수를 더해서 순위를 매기고, 상위 5개만 돌려준다. 동점이면 이름 가나다순.
    private List<String> recommendFoods(FoodBtiScoreDto score) {
        Map<Character, Integer> scoreByLetter = Map.of(
                'L', score.getL(), 'S', score.getS(), 'F', score.getF(), 'N', score.getN(),
                'A', score.getA(), 'T', score.getT(), 'P', score.getP(), 'I', score.getI());

        return Arrays.stream(FOOD_CANDIDATES)
                .sorted(Comparator
                        .<String[]>comparingInt(food -> -tagScore(food[1], scoreByLetter))
                        .thenComparing(food -> food[0], Collator.getInstance(Locale.KOREAN)))
                .limit(5)
                .map(food -> food[0])
                .collect(Collectors.toList());
    }

    private int tagScore(String tag, Map<Character, Integer> scoreByLetter) {
        int sum = 0;
        for (char c : tag.toCharArray()) {
            sum += scoreByLetter.get(c);
        }
        return sum;
    }

    // 05(회원정보수정)/07(음식점 검색)에서 쓰는 "비로그인이면 null" 패턴과 동일(RestaurantServiceImpl 참고)
    // — 이 API는 로그인 없이도 동작해야 하므로 필수 인증(resolveMemberId, 401)이 아니라 이 패턴을 쓴다.
    private Long resolveMemberIdOrNull(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        try {
            Claims claims = jwtProvider.parseClaims(accessToken);
            if (!accessTokenSessionService.isActive(claims.getId())) {
                return null;
            }
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
