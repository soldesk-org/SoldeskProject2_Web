package com.foodtrip.foodsearch.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.model.FoodBtiProfile;

 // 16개 음BTI 결과 데이터를 관리합니다.
 // 결과 문구를 수정할 때 계산 코드를 건드리지 않아도 되도록 별도 클래스로 분리했습니다.

@Component
public class FoodBtiProfileCatalog {

    private final Map<String, FoodBtiProfile> profiles;

    public FoodBtiProfileCatalog() {
        Map<String, FoodBtiProfile> profileMap = new LinkedHashMap<>();

        add(profileMap, "LFAP", "차분한 단골 설계자",
                "담백하고 익숙한 메뉴를 선호하며, 혼자 먹을 식당도 미리 꼼꼼하게 알아보는 유형입니다.");
        add(profileMap, "LFAI", "담백한 혼밥러",
                "익숙하고 부담 없는 음식을 혼자 편안하게 즐기며, 그날 기분에 따라 가볍게 선택하는 유형입니다.");
        add(profileMap, "LFTP", "정겨운 맛집 리더",
                "편안하고 검증된 메뉴를 사람들과 함께 즐기며, 식사 장소를 미리 정해두는 유형입니다.");
        add(profileMap, "LFTI", "편안한 번개 식객",
                "익숙하고 담백한 음식을 좋아하며, 사람들과 즉흥적으로 식사 약속을 잡는 유형입니다.");

        add(profileMap, "LNAP", "꼼꼼한 메뉴 개척자",
                "부담 없는 맛을 선호하면서도 새로운 메뉴를 탐색하고, 혼자만의 미식 계획을 세우는 유형입니다.");
        add(profileMap, "LNAI", "조용한 맛 탐험가",
                "담백한 새 메뉴를 발견하면 혼자서도 가볍게 도전하는 자유로운 유형입니다.");
        add(profileMap, "LNTP", "계획형 푸드 큐레이터",
                "새롭고 섬세한 맛을 찾아 사람들과 나누며, 방문할 식당과 메뉴를 미리 조사하는 유형입니다.");
        add(profileMap, "LNTI", "함께 떠나는 맛 모험가",
                "부담 없는 새로운 음식을 좋아하고, 사람들과 즉흥적인 미식 경험을 즐기는 유형입니다.");

        add(profileMap, "SFAP", "매운맛 단골 전략가",
                "강한 맛의 익숙한 메뉴를 선호하며, 혼자 먹을 때도 검증된 식당을 미리 찾아보는 유형입니다.");
        add(profileMap, "SFAI", "화끈한 혼밥 직진러",
                "익숙하고 자극적인 음식이 생각나면 혼자라도 바로 먹으러 가는 유형입니다.");
        add(profileMap, "SFTP", "검증된 회식 대장",
                "강렬하고 익숙한 메뉴를 사람들과 즐기며, 실패 없는 식사 자리를 계획하는 유형입니다.");
        add(profileMap, "SFTI", "즉흥 야식 파티원",
                "익숙한 강한 맛을 좋아하고, 사람들과 갑자기 잡힌 식사나 야식을 즐기는 유형입니다.");

        add(profileMap, "SNAP", "치밀한 강맛 개척자",
                "자극적인 새로운 메뉴를 혼자서도 탐색하며, 도전할 식당을 미리 조사하는 유형입니다.");
        add(profileMap, "SNAI", "혼자 떠나는 매운 모험가",
                "강렬하고 낯선 음식도 망설이지 않고 혼자 즉흥적으로 도전하는 유형입니다.");
        add(profileMap, "SNTP", "매운맛 탐험가",
                "강렬한 맛과 새로운 음식을 좋아하며, 사람들과 함께 새로운 맛집을 계획해 찾아다니는 유형입니다.");
        add(profileMap, "SNTI", "번개 미식 원정대장",
                "새롭고 강한 맛을 찾아 사람들과 즉흥적으로 움직이는 활발한 유형입니다.");

        profiles = Map.copyOf(profileMap);
    }

    public FoodBtiProfile getByType(String type) {
        FoodBtiProfile profile = profiles.get(type);
        if (profile == null) {
            throw new IllegalArgumentException("등록되지 않은 음BTI 유형입니다: " + type);
        }
        return profile;
    }

    public int size() {
        return profiles.size();
    }

    private void add(Map<String, FoodBtiProfile> profileMap, String type, String name, String description) {
        profileMap.put(type, new FoodBtiProfile(type, name, description));
    }
}
