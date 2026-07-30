package com.foodtrip.foodsearch.foodbti.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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
@Service
public class FoodBtiServiceImpl implements FoodBtiService {

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
        questions.add(new FoodBtiQuestionDto(3, "야식으로 더 먹고싶은 음식은?",
                new FoodBtiChoiceDto("샌드위치, 죽, 셀러드처럼 부담이 없고 부드러운 음식.", "L"),
                new FoodBtiChoiceDto("닭발, 떡볶이, 마라탕처럼 강렬한 음식.", "S")));

        // 두번째 성향 - F : 익숙한 음식 / N : 새로운 음식
        questions.add(new FoodBtiQuestionDto(4, "만약 해외여행에서 현지 음식을 발견한다면?",
                new FoodBtiChoiceDto("내가 조금이라도 알고 있는 무난한 음식을 찾는다.", "F"),
                new FoodBtiChoiceDto("현지에서만 먹을 수 있는 음식에 도전한다.", "N")));
        questions.add(new FoodBtiQuestionDto(5, "자주 가는 맛집이 생겼을 때 나는?",
                new FoodBtiChoiceDto("마음에 들었던 메뉴를 계속 주문한다.", "F"),
                new FoodBtiChoiceDto("다른 메뉴를 골라가며 먹어본다.", "N")));
        questions.add(new FoodBtiQuestionDto(6, "처음 방문한 식당에서 메뉴를 고를때 나는?",
                new FoodBtiChoiceDto("익숙한 메뉴를 선택한다.", "F"),
                new FoodBtiChoiceDto("처음 보는 메뉴에 도전해본다.", "N")));

        // 세번째 성향 - A : 혼자먹기 / T : 함께 먹기
        questions.add(new FoodBtiQuestionDto(7, "맛있는 음식이 생각났을 때 나는?",
                new FoodBtiChoiceDto("혼자라도 바로 먹으러 간다.", "A"),
                new FoodBtiChoiceDto("같이 먹으러 갈사람을 먼저 찾는다.", "T")));
        questions.add(new FoodBtiQuestionDto(8, "밥을 먹을 때 선호하는 분위기는?",
                new FoodBtiChoiceDto("혼자 조용하고 편하게 먹는 분위기.", "A"),
                new FoodBtiChoiceDto("친구 또는 지인과 이야기하며 먹는 분위기.", "T")));
        questions.add(new FoodBtiQuestionDto(9, "길을 가다 새로운 맛집을 발견했을 때 나는?",
                new FoodBtiChoiceDto("내 일정에 맞춰 혼자라도 방문.", "A"),
                new FoodBtiChoiceDto("친구와 공유하고 함께 방문.", "T")));

        // 네번째 성향 - P : 계획적으로 선택 / I : 즉흥적으로 선택
        questions.add(new FoodBtiQuestionDto(10, "식당에 방문하기 전 나는?",
                new FoodBtiChoiceDto("메뉴, 가격, 리뷰 미리 확인한다.", "P"),
                new FoodBtiChoiceDto("일단 방문해서 끌리는 메뉴를 선택한다.", "I")));
        questions.add(new FoodBtiQuestionDto(11, "주말 외식 장소를 정할 때 나는?",
                new FoodBtiChoiceDto("며칠 전부터 식당을 검색하고 정한다.", "P"),
                new FoodBtiChoiceDto("당일 나가서 먹고싶은 메뉴를 선택한다.", "I")));
        questions.add(new FoodBtiQuestionDto(12, "식당에 웨이팅이 길게 있다면 나는?",
                new FoodBtiChoiceDto("미리 찾아둔 다음 식당으로 이동한다.", "P"),
                new FoodBtiChoiceDto("주변을 둘러보다 가장 눈에 띄는 식당으로 들어간다.", "I")));

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
            member.updateFoodBti(resultType);
            saved = true;
        }

        return createResult(resultType, score, saved);
    }

    private FoodBtiResultResponseDto createResult(String resultType, FoodBtiScoreDto score, boolean saved) {
        if ("SNTP".equals(resultType)) {
            return new FoodBtiResultResponseDto(resultType, "매운맛 탐험가",
                    "강렬한 맛과 새로운 음식을 좋아하며, 사람들과 함께 새로운 맛집을 찾아다니는 유형.",
                    Arrays.asList("마라탕", "닭발", "쭈꾸미", "매운 갈비찜", "국물 떡볶이"), score, saved);
        }
        if ("LFAI".equals(resultType)) {
            return new FoodBtiResultResponseDto(resultType, "담백한 혼밥러",
                    "익숙하고 부담 없는 음식을 혼자 편안하게 즐기는 것을 좋아하는 유형입니다.",
                    Arrays.asList("칼국수", "백반", "죽", "국밥", "셀러드"), score, saved);
        }
        // 아직 상세 결과가 등록되지 않은 나머지 14개 유형은 성향을 조합해 결과를 생성한다.
        return new FoodBtiResultResponseDto(resultType, createDefaultName(resultType),
                createDefaultDescription(resultType), createDefaultFoods(resultType), score, saved);
    }

    private String createDefaultName(String resultType) {
        String tasteName = resultType.startsWith("S") ? "강렬한" : "편안한";
        String foodStyle = resultType.charAt(1) == 'N' ? "음식 탐험가" : "단골 미식가";
        return tasteName + " " + foodStyle;
    }

    private String createDefaultDescription(String resultType) {
        String taste = resultType.charAt(0) == 'S' ? "자극적이고 강한 맛을 좋아하고" : "담백하고 편안한 맛을 좋아하고";
        String challenge = resultType.charAt(1) == 'N' ? "새로운 음식에 도전하는 편이며" : "익숙하고 검증된 음식을 선호하며";
        String social = resultType.charAt(2) == 'T' ? "다른 사람들과 함께 먹는 것을 즐기고" : "혼자 편안하게 먹는 것을 좋아하고";
        String choice = resultType.charAt(3) == 'P' ? "식당과 메뉴를 미리 알아보는 타입입니다." : "기분에 따라 즉흥적으로 메뉴를 고르는 타입입니다.";
        return taste + ", " + challenge + ", " + social + ", " + choice;
    }

    private List<String> createDefaultFoods(String resultType) {
        List<String> foods = new ArrayList<>();
        if (resultType.charAt(0) == 'S') {
            foods.add("떡볶이");
            foods.add("마라탕");
        } else {
            foods.add("칼국수");
            foods.add("백반");
        }
        if (resultType.charAt(1) == 'N') {
            foods.add("이색 퓨전 음식");
        } else {
            foods.add("단골집 대표 메뉴");
        }
        if (resultType.charAt(2) == 'T') {
            foods.add("삼겹살");
        } else {
            foods.add("덮밥");
        }
        if (resultType.charAt(3) == 'P') {
            foods.add("예약 가능한 인기 맛집");
        } else {
            foods.add("오늘 생각난 메뉴");
        }
        return foods;
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
