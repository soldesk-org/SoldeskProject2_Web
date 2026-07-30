package com.foodtrip.foodsearch.reviewfilter.filter;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 한국어 욕설/비속어 판별 — Tanat05/korcen(MIT License, https://github.com/KR-korcen/korcen)의
 * 판정 로직을 순수 Java로 이식한 것(2026-07-30, 17.리뷰-필터링). 기존에는 별도 Python(FastAPI) 서버를
 * 띄워서 그 라이브러리를 그대로 호출했으나(review-filter, korcen 패키지), Python 프로세스를 따로 켜야
 * 하는 구조를 없애기 위해 이 판정 로직 자체를 Java로 옮겼다.
 *
 * 원본 korcen은 general/minor/sexual/belittle/race/parent/english/japanese/chinese/special/politics
 * 10개 이상 카테고리를 지원하지만, 이 프로젝트가 실제로 쓰던 호출(`korcen.check(text)`, foreign=False)은
 * english/japanese/chinese를 포함하지 않았으므로 그 3개는 이식하지 않았다 — 원본의 하이라이트 기능
 * (highlight_profanity)도 이 프로젝트에서 쓰지 않아 이식 대상에서 제외했다.
 *
 * 판정 흐름(원본과 동일): URL 제거 → 소문자화 + 문자 정규화(유사 문자를 표준 문자로 치환) + 다중문자
 * 치환 + 공백 제거 + 카테고리별 전처리 → 오탐(false-positive) 문자열 제거 → 허용 문자셋 필터링(special
 * 카테고리는 생략) → 욕설 패턴 매칭.
 */
public final class KorcenProfanityFilter {

    private KorcenProfanityFilter() {
    }

    private static final Pattern URL_PATTERN = Pattern.compile("https?://\\S+|www\\.\\S+");
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");

    private static final String CHARSET_1 = "[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣ㅗ@=\\-_]+"; // general/sexual/parent/politics
    private static final String CHARSET_2 = "[^ㄱ-ㅎㅏ-ㅣ가-힣]+"; // minor/belittle/race

    private static final Map<Character, Character> SINGLE_CHAR_MAP = buildSingleCharMap();
    private static final Map<String, String> MULTI_CHAR_MAP = buildMultiCharMap();
    private static final Pattern MULTI_CHAR_PATTERN = buildMultiCharPattern(MULTI_CHAR_MAP);

    private enum Level {
        GENERAL(GENERAL_FALSE_POSITIVE, CHARSET_1, GENERAL_PROFANITY),
        MINOR(MINOR_FALSE_POSITIVE, CHARSET_2, MINOR_PROFANITY),
        SEXUAL(SEXUAL_FALSE_POSITIVE, CHARSET_1, SEXUAL_PROFANITY),
        BELITTLE(BELITTLE_FALSE_POSITIVE, CHARSET_2, BELITTLE_PROFANITY),
        RACE(RACE_FALSE_POSITIVE, CHARSET_2, RACE_PROFANITY),
        PARENT(PARENT_FALSE_POSITIVE, CHARSET_1, PARENT_PROFANITY),
        SPECIAL(null, null, SPECIAL_PROFANITY),
        POLITICS(POLITICS_FALSE_POSITIVE, CHARSET_1, POLITICS_PROFANITY);

        private final Pattern falsePositiveRegex;
        private final String charsetRegex;
        private final Pattern profanityRegex;

        Level(String[] falsePositives, String charsetRegex, String[] profanityPatterns) {
            this.falsePositiveRegex = falsePositives == null ? null : buildAlternationPattern(falsePositives);
            this.charsetRegex = charsetRegex;
            this.profanityRegex = buildAlternationPattern(profanityPatterns);
        }
    }

    /** 원본의 check(text, foreign=False)와 동일 — 8개 국내 카테고리 중 하나라도 걸리면 true. */
    public static boolean containsProfanity(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        for (Level level : Level.values()) {
            if (matches(text, level)) {
                return true;
            }
        }
        return false;
    }

    private static boolean matches(String text, Level level) {
        String textNoUrls = URL_PATTERN.matcher(text).replaceAll("");
        String processedText = preprocess(textNoUrls, level);

        String withoutFalsePositives = level.falsePositiveRegex == null
                ? processedText
                : level.falsePositiveRegex.matcher(processedText).replaceAll("");

        String finalText;
        if (level == Level.SPECIAL) {
            finalText = withoutFalsePositives;
        } else {
            finalText = withoutFalsePositives.replaceAll(level.charsetRegex, "");
        }

        if (level.profanityRegex.matcher(finalText).find()) {
            return true;
        }

        // 원본의 EXACT_MATCH_PROFANITY({"tq", "qt"}) — general 레벨에서만, 전처리 직후 문자열
        // 전체가 정확히 일치할 때만 적용(오탐 제거 필터링 전 단계 기준).
        return level == Level.GENERAL && (processedText.equals("tq") || processedText.equals("qt"));
    }

    private static String preprocess(String text, Level level) {
        String processed = text.toLowerCase();
        processed = translateSingleChars(processed);
        processed = applyMultiCharReplacements(processed);
        processed = WHITESPACE_PATTERN.matcher(processed).replaceAll("");

        switch (level) {
            case MINOR -> {
                processed = processed.replace("년", "놈").replace("련", "놈");
            }
            case BELITTLE -> {
                processed = processed.replace("뇬", "련").replace("놈", "련").replace("넘", "련");
                processed = processed.replace("련", "년");
            }
            case SEXUAL -> processed = processed.replace("보g", "보지");
            default -> {
                // general/race/parent/special/politics는 추가 전처리 없음
            }
        }
        return processed;
    }

    private static String translateSingleChars(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            sb.append(SINGLE_CHAR_MAP.getOrDefault(c, c));
        }
        return sb.toString();
    }

    private static String applyMultiCharReplacements(String text) {
        Matcher matcher = MULTI_CHAR_PATTERN.matcher(text);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(sb, Matcher.quoteReplacement(MULTI_CHAR_MAP.get(matcher.group())));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private static Pattern buildAlternationPattern(String[] literals) {
        String joined = Stream.of(literals)
                .map(Pattern::quote)
                .collect(Collectors.joining("|"));
        return Pattern.compile(joined);
    }

    private static Pattern buildMultiCharPattern(Map<String, String> map) {
        String joined = map.keySet().stream()
                .sorted((a, b) -> b.length() - a.length())
                .map(Pattern::quote)
                .collect(Collectors.joining("|"));
        return Pattern.compile(joined);
    }

    private static Map<Character, Character> buildSingleCharMap() {
        Map<Character, Character> map = new LinkedHashMap<>();
        // 유니코드 변형 문자(수학 기호체, 원문자, 발음 구별 기호 등)를 표준 문자로 정규화.
        // Python dict 리터럴과 동일한 순서로 넣어서, 같은 key가 여러 번 나오면 마지막 값이 이긴다.
        putAll(map, "s", "𝗌𝘴𝙨𝚜𝐬𝑠𝒔𝓈𝓼𝔰𝖘𝕤ｓşⓢ🅢🆂🅂𝑺ſšśŝṣṡșṥṧṩ$");
        putAll(map, "e", "𝖾𝘦𝙚𝚎𝐞𝑒𝒆ℯ𝓮𝔢𝖊𝕖ｅėⓔ⒠🅔🅴🄴єêëéèēĕěęẹẻẽếềệễể3€");
        putAll(map, "x", "𝗑𝘹𝙭𝚡𝐱𝑥𝒙𝓍𝔁𝔵𝖝𝕩ｘⓧ⒳🅧🆇🅇×✕✖❌⨯⚔*✗✘");
        putAll(map, "u", "ųüúùûũūŭůűụư");
        putAll(map, "c", "çćĉčċ¢©ḉ(<");
        putAll(map, 'F', "ＦḞƑℱꞘꝼ");
        putAll(map, 'K', "ＫḰǨḲḴⱪꝀ");
        putAll(map, 'C', "ＣĆĈČĊÇḈ");
        putAll(map, 'U', "ＵÚÙÛŨŪŬŮŰỤ");
        putAll(map, 'ㅗ', "ㅗ┻┴┹⊥†⟂╨╧╥");
        putAll(map, 'ㅅ', "^人∧㉦ᐲΛ⩘⋀⩚");
        putAll(map, 'ㅂ', "甘廿ᗨᗐᗕ田口日目囗");
        map.put('己', 'ㄹ');
        map.put('乙', 'ㄹ');
        map.put('已', 'ㄹ');
        map.put('巳', 'ㄹ');
        map.put('匚', 'ㄷ');
        putAll(map, 'ㅏ', "卜rF丨|ㅣ/⼃⼁⼂");
        putAll(map, 'ㅣ', "l1|I!¦｜￤ІӀ");
        putAll(map, 'ㅐ', "Hㅖㅒ");
        map.put('Н', 'ㅐ');
        map.put('Ⲏ', 'ㅐ');
        map.put('ℍ', 'ㅐ');
        putAll(map, '새', "🐦🐔🦅🦉🦆🦜🦤🦢🕊");
        putAll(map, '개', "🐕🐶🐺");
        putAll(map, '조', "丕朝則兆組早鳥潮照");
        putAll(map, 'ㅇ', "0Oo◯⭕○●◎◉◌");
        putAll(map, 'a', "a@4αäåãāȧǎ");
        putAll(map, 'b', "b86ƃɓƄℬᖯᑲ");
        putAll(map, 'd', "dḋḍᑯᗞᗪᖙⅆɗ");
        putAll(map, 'f', "fƒḟſⅎᶂꜰꟻ");
        putAll(map, 'g', "g9ǥɡġģĝǧ");
        putAll(map, 'h', "hĥħƕḥḫⱨꜧ");
        putAll(map, 'i', "i1!|īĭǐį");
        putAll(map, 'j', "jĵǰȷɉⱼʝɟ");
        putAll(map, 'k', "kķƙǩḱḳḵⱪ");
        putAll(map, 'l', "l1|ĺļľŀł");
        putAll(map, 'm', "mɱḿṁṃⱥᵯᴍ");
        putAll(map, 'n', "nńňñņṅṇṉ");
        putAll(map, 'p', "pṕṗƥᵽᵱᴘᑭ");
        putAll(map, 'q', "q9ʠɋȹⱊⱍꝗ");
        putAll(map, 'r', "rŕřŗṙṛṝṟ");
        putAll(map, 't', "t7+ťţŧțṫ");
        putAll(map, 'v', "vṿⱴᵥᵛ√ᐱ∨");
        putAll(map, 'w', "wẁẃẅŵẇẉⱳ");
        putAll(map, 'y', "yýỳŷÿȳẏỵ");
        putAll(map, 'z', "z2źẑžżẓẕ");
        return map;
    }

    private static void putAll(Map<Character, Character> map, String target, String sources) {
        putAll(map, target.charAt(0), sources);
    }

    // 코드포인트 단위로 순회 — 이모지 등 BMP 밖(surrogate pair) 문자를 char 단위로 순회하면 서로 다른
    // 이모지가 상위 서로게이트를 공유해서(예: 🖕와 🐦 둘 다 U+D83D로 시작) 잘못 뒤섞이는 문제가 생긴다.
    // Map<Character,Character>로는 BMP 밖 문자를 온전히 표현할 수 없으므로 그런 문자는 건너뛴다
    // (실제 판정에 영향 없음 — translateSingleChars가 처리 못한 문자는 원본 그대로 통과시키기 때문).
    private static void putAll(Map<Character, Character> map, char target, String sources) {
        sources.codePoints().forEach(cp -> {
            if (cp <= 0xFFFF) {
                map.put((char) cp, target);
            }
        });
    }

    private static Map<String, String> buildMultiCharMap() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("_ㅣ_", "ㅗ");
        map.put("_/_", "ㅗ");
        map.put("_ |\\_", "ㅗ");
        map.put("_|\\_", "ㅗ");
        map.put("_ㅣ\\_", "ㅗ");
        map.put("_I_", "ㅗ");
        map.put("／＼", "ㅅ");
        map.put("/＼", "ㅅ");
        map.put("77", "ㄲ");
        map.put("刀卜", "까");
        map.put("₨", "rs");
        map.put("ㅇl=스", "섹스");
        map.put("ㅇㅣ-ㅣ", "애");
        map.put("lㅣ", "니");
        map.put("ㅁㅣ", "미");
        return map;
    }

    // ------------------------------------------------------------------
    // 카테고리별 오탐(false-positive) 문자열 — 이 안에 들어있으면 욕설 판정에서 제외한다.
    // ------------------------------------------------------------------
    private static final String[] GENERAL_FALSE_POSITIVE = {
            "ㅗ먹어", "오ㅗ", "해ㅗ", "호ㅗ", "로ㅗ", "옹ㅗ", "롤ㅗ", "요ㅗ", "우ㅗ", "하ㅗ",
            "ㅗ오", "ㅗ호", "ㅗ로", "ㅗ옹", "ㅗ롤", "ㅗ요", "ㅗ우", "ㅗ하",
            "ㅗㅗ오", "ㅗㅗ호", "ㅗㅗ로", "ㅗㅗ옹", "ㅗㅗ롤", "ㅗㅗ요", "ㅗㅗ우", "ㅗㅗ하",
            "오ㅗㅗㅗ", "호ㅗㅗㅗ", "로ㅗㅗㅗ", "옹ㅗㅗㅗ", "롤ㅗㅗㅗ", "요ㅗㅗㅗ", "우ㅗㅗㅗ", "하ㅗㅗㅗ",
            "오ㅗㅗㅗㅗ", "호ㅗㅗㅗㅗ", "로ㅗㅗㅗㅗ", "옹ㅗㅗㅗㅗ", "롤ㅗㅗㅗㅗ", "요ㅗㅗㅗㅗ", "우ㅗㅗㅗㅗ", "하ㅗㅗㅗㅗ",
            "ㅇㅗ", "ㅗㄷ", "ㅗㅜ", "rㅗ", "ㅗr", "sㅗ", "ㅗs", "eㅗ", "ㅗe", "fㅗ", "ㅗf", "aㅗ", "ㅗa",
            "qㅗ", "ㅗq", "ㅗw", "wㅗ", "ㅗd", "dㅗ", "ㅗg", "gㅗ", "ㅈㅗ118", "218", "318", "418", "518", "618", "718", "818", "918", "018",
            "8분", "8시", "8시발",
            "발닦", "동시8", "다시방", "시불이익", "다시바꿀", "다시바꿔", "다시불러", "다시불안",
            "하시바라이노스케", "할시", "시발음", "시발택시", "시발자동차", "정치발", "시발점", "시발유",
            "시발역", "시발수뢰", "아저씨바", "아저씨발", "시바견", "벌어", "시바이누", "시바스리갈",
            "시바산", "시바신", "오리발", "발끝", "다시바", "다시팔", "비슈누시바", "시바핫카이",
            "시바타이쥬", "데스티니시바", "시바루", "시바료타로", "시바라스시", "임시방편", "젤리",
            "발사", "크시야", "크시", "어찌", "가시방석", "발로란트방", "발로란트", "발로", "씨발라",
            "무시발언", "일시불", "우리", "혹시", "아조씨", "아저씨", "바로", "저거시", "우리발",
            "피시방", "피씨방", "방장", "시바사키", "시발차", "구로역시발", "로벅스", "쉬바나", "벌었는데",
            "엠씨방", "빨리", "파엠", "벌금", "시방향", "불법", "발릴", "발표", "방송", "역시", "바보",
            "쿨리발리", "슈발리에", "방탄", "방어", "발표", "상시", "다시팔게",
            "opgg",
            "있지", "없지", "하지", "알았지", "몰랐지", "근데", "지근거", "지근하", "지근지근", "지근속근",
            "속든지근", "미지근", "지랄탄", "지랄버릇",
            "0등신", "1등신", "2등신", "3등신", "4등신", "5등신", "6등신", "7등신", "8등신", "9등신",
            "붕우유신",
            "전염병", "감염병", "화염병",
            "왜꺼져", "꺼져요", "이꺼져", "꺼져서", "내꺼져", "제꺼져", "꺼져있", "꺼져잇", "꺼져도",
            "계속꺼져", "꺼져가",
            "새로", "의새끼", "루세끼", "시세끼", "세끼먹", "고양이새끼", "호랑이새끼", "용새끼", "말새끼",
            "사자새끼", "범새끼", "삵새끼", "키보드", "새끼손", "셰리프", "로쉐리", "새끼 양", "새끼 고양이",
            "새끼 사자", "새끼 호랑이", "새끼 용", "새끼 범", "새끼 삵", "새끼 개", "새끼 늑대",
            "0개", "1개", "2개", "3개", "4개", "5개", "6개", "7개", "8개", "9개",
            "1년", "2년", "3년", "4년", "5년", "6년", "7년", "8년", "9년",
            "재밌게놈", "있게", "년생", "무지개색", "떠돌이개", "에게", "넘는", "소개", "생긴게", "날개같다",
            "줫습니다", "줫음", "줫잖아", "줫겠지", "쫒아", "쫒는", "쫒기다", "쫒기라", "쫒기로",
            "쫒기를", "쫒기며", "쫒기는", "쫒기나", "쫒겨", "쫒겻", "쫒겼", "쫒았", "쫒다", "쫒고",
            "줫는", "줫어", "줬는", "줫군", "줬다", "줬어", "천조", "쫒기", "해줫더니", "줫다", "내쫒은",
            "내쫒다", "좇아", "날개",
            "ㅡ"
    };
    private static final String[] MINOR_FALSE_POSITIVE = {
            "거미", "친구", "개미", "이미친", "미친증", "동그라미",
            "뒤져봐야", "뒤질뻔", "뒤져보다", "뒤져보는", "뒤져보고", "뒤져간다", "뒤져서",
            "뒤져본", "뒤져봄", "뒤져볼",
    };
    private static final String[] SEXUAL_FALSE_POSITIVE = {
            "보지도못", "보지도않", "인가보지", "면접보지", "영화보지", "애니보지", "만화보지", "사진보지",
            "그림보지", "을보지", "나보지", "못보지", "안보지", "왜보지", "뭐보지", "다보지", "빨리보지",
            "보지도마", "보지는않", "보지안으", "보지안아", "게보지", "어케보지", "하나보지", "켜보지",
            "보지맙", "초보지", "로보지", "가보지", "홍보지", "서보지", "보지금", "보지못", "정지금",
            "걸보지", "보지는", "보지지", "보지않", "해보지", "보지마", "보지말", "안보지만", "정보",
            "지팡이", "행보", "바보지", "바보짓", "물어보지", "하시나보지", "챙겨보지만", "봐보지", "보지마라",
            "언제자지", "잠자지", "자지말자고", "지급", "남자지", "여자지", "감자지", "왁자지", "자지러",
            "개발자", "관리자", "약탈자", "타자지", "혼자", "자지원", "사용자", "경력자", "지식", "자지마",
            "자지말", "지원자", "부자지", "혜자지", "잘자지", "일자지", "일찍자지", "지원", "자지금", "자지않",
            "어케자지", "자지도마", "자지는않", "자지좀마", "안자지", "못자지", "지건", "감자", "자 지울거죠",
            "자지말아주세요", "자지마세요", "자지마라", "자지말고",
            "cess", "```css", "ex)", "exit", "ext", "images", "https", "(ex", ".ex", "physics", "features", "exam",
            "phase", "except", "sexual", "sexy", "엑섹스", "엑",
            "야스오", "크시야", "카구야", "스파이", "말이야", "스티브", "스쿼드", "파랑색", "오야스미", "노란색",
            "빨간색", "초록색", "보라색", "청색", "핑크색", "남색", "검은색", "하양색", "주황색", "연두색",
            "스공", "스시", "스키장", "스킨", "스킬", "스틸", "스탑", "스트레스", "해야", "카시야스", "야스톤", "유니섹스", "스튜디오",
            "위대한", "소유자", "작업자", "자기위로", "위대하지", "암살자", "학자",
            "freenude", "상자"
    };
    private static final String[] BELITTLE_FALSE_POSITIVE = {
            "려운지", "무서운지", "라운지", "운지법", "싸운지", "운지버섯", "운지린다", "깔보다", "깔보시",
            "1년", "2년", "3년", "4년", "5년", "6년", "7년", "8년", "9년", "0년",
            "더운지역", "나따까리", "지킬앤하이드", "지킬엔하이드",
    };
    private static final String[] RACE_FALSE_POSITIVE = {"흑형님"};
    private static final String[] PARENT_FALSE_POSITIVE = {"ㄴㄴ", "미국", "엄창못"};
    private static final String[] POLITICS_FALSE_POSITIVE = {
            "카카오톡", "카톡", "카페", "하다가", "먹다가", "카와이", "카츠", "카레", "니가", "내가", "너가",
            "우리가", "너희가", "카카오", "카세트", "카플레이어", "카운터", "카정", "카드", "카구"
    };

    // ------------------------------------------------------------------
    // 카테고리별 실제 욕설/비속어 패턴
    // ------------------------------------------------------------------
    private static final String[] GENERAL_PROFANITY = {
            "ㅗ", "씨8", "18아", "18놈", "tㅂ", "t발", "ㅆㅍ", "sibal", "sival", "sibar", "sibak", "sipal",
            "siqk", "tlbal", "tlval", "tlbar", "tlbak", "tlpal", "tlqk", "시발", "시val", "시bar",
            "시bak", "시pal", "시qk", "si바", "si발", "si불", "si빨", "si팔", "tl바", "tl발", "tl불", "tl빨", "tl팔",
            "siba", "tlba", "siva", "tlva", "tlqkf", "10발놈", "10발년", "tlqkd", "si8", "10r놈", "시8", "십8",
            "s1bal", "sib알", "씨x", "siㅂ", "丨발", "丨벌", "丨바", "ㅅ1", "시ㅣ", "씨ㅣ", "8시발",
            "ㅆ발", "ㅅ발", "ㅅㅂ", "ㅆㅂ", "ㅆ바", "ㅅ바", "시ㅂㅏ", "ㅅㅂㅏ", "시ㅏㄹ", "씨ㅏㄹ",
            "ㅅ불", "ㅆ불", "ㅅ쁠", "ㅆ뿔", "ㅆㅣ발", "ㅅㅟ발", "ㅅㅣㅂㅏ", "ㅣ바알", "ㅅ벌", "^^ㅣ벌",
            "ㅆ삐라", "씨ㅃ", "^^/발", "시봘", "씨봘", "씨바", "시바", "샤발", "씌발", "씹발", "시벌",
            "시팔", "싯팔", "씨빨", "씨랼", "씨파", "띠발", "띡발", "띸발", "싸발", "십발", "슈발",
            "야발", "씨불", "씨랄", "쉬발", "쓰발", "쓔발", "쌰발", "쒸발", "씨팔", "씨밝",
            "씨밯", "쑤발", "치발", "발씨", "리발", "씨볼", "찌발", "씨비바라랄", "시바랄",
            "씨바라", "쒸팔", "쉬팔", "씨밮", "쒸밮", "시밮", "씨삐라", "씨벌", "슈벌", "시불",
            "시부렝", "씨부렝", "시부랭", "씨부랭", "발놈시", "뛰발", "뛰봘", "뜨발", "뜨벌",
            "띄발", "씨바알", "샤빨", "스벌", "쓰벌", "신발련", "신발년", "신발놈", "띠바랄", "시방",
            "씨방", "씨부련", "시부련", "씨잇발", "씨잇파알", "씨잇바알", "시잇발", "시잇바알", "쒸이발",
            "쉬이빨", "씹팔", "쉬바", "시병발신", "씱빩", "쉬바난", "쉬바놈", "쉬바녀", "쉬바년", "쉬바노마", "쉬바새", "쉬불", "쉬이바",
            "시벨놈", "시뱅놈", "시봉새", "씻뻘", "씌벌",
            "wlfkf", "g랄", "g럴", "g롤", "g뢀", "giral", "zi랄", "ji랄", "ㅈㄹ", "지ㄹ", "ㅈ랄", "ㅈ라",
            "지랄", "찌랄", "지럴", "지롤", "랄지", "쥐랄", "쮜랄", "지뢀", "띄랄",
            "ㅄ", "ㅂㅅ", "병ㅅ", "ㅂ신", "ㅕㅇ신", "ㅂㅇ신", "뷰신", "병신", "병딱", "벼신", "붱신",
            "뼝신", "뿽신", "삥신", "병시니", "병형신", "뵹신", "병긴", "비응신",
            "염병", "엠병", "옘병", "얨병", "옘뼝",
            "꺼져",
            "엿같", "엿가튼", "엿먹어", "뭣같은",
            "rotorl", "rotprl", "sib새", "ah끼", "sㅐ끼", "x끼",
            "ㅅㄲ", "ㅅ끼", "ㅆ끼", "색ㄲㅣ", "ㅆㅐㄲㅑ", "ㅆㅐㄲㅣ", "새끼", "쉐리", "쌔끼", "썌끼",
            "쎼끼", "쌬끼", "샠끼", "세끼", "샊", "쌖", "섺", "쎆", "십새", "새키", "씹색", "새까",
            "새꺄", "샛끼", "새뀌", "새끠", "새캬", "색꺄", "색끼", "섹히", "셁기", "셁끼", "셐기",
            "셰끼", "셰리", "쉐꺄", "십색꺄", "십떼끼", "십데꺄", "십때끼", "십새꺄", "십새캬", "쉑히",
            "씹새기", "고아새기", "샠기", "애새기", "이새기", "느그새기", "장애새기",
            "w같은", "ㅈ같", "ㅈ망", "ㅈ까", "ㅈ경", "ㅈ가튼", "좆", "촟", "조까", "좈", "쫒", "졷",
            "좃", "줮", "좋같", "좃같", "좃물", "좃밥", "줫", "좋밥", "좋물", "좇",
            "썅", "씨앙", "씨양", "샤앙", "쌰앙",
            "뻑유", "뻐킹", "뻐큐", "빡큐", "뿩큐", "뻑큐", "빡유", "뻒큐",
            "닥쳐", "닭쳐", "닥치라", "아가리해",
            "dog새", "개ㅐ색",
            "개같", "개가튼", "개쉑", "개스키", "개세끼", "개색히", "개가뇬", "개새기", "개쌔기", "개쌔끼",
            "쌖", "쎆", "새긔", "개소리", "개년", "개드립", "개돼지", "개씹창", "개간나", "개스끼", "개섹기",
            "개자식", "개때꺄", "개때끼", "개발남아", "개샛끼", "개가든", "개가뜬", "개가턴", "개가툰",
            "개갇은", "개갈보", "개걸레", "개너마", "개너므", "개넌", "개넘", "개녀나",
            "개노마", "개노무새끼", "개논", "개놈", "개뇨나", "개뇬", "개뇸", "개뇽", "개눔", "개느마",
            "개늠", "개랙기", "개련", "개발남아", "개발뇬", "개색", "개색기",
            "개색끼", "개샛키", "개샛킹", "개샛히", "개샜끼", "개생키", "개샠", "개샤끼", "개샤킥",
            "개샥", "개샹늠", "개세리", "개세키", "개섹히", "개섺", "개셃", "개셋키", "개셐",
            "개셰리", "개솩", "개쇄끼", "개쇅", "개쇅끼", "개쇅키", "개쇗", "개쇠리", "개쉐끼", "개쉐리",
            "개쉐키", "개쉑갸", "개쉑기", "개쉑꺄", "개쉑끼", "개쉑캬", "개쉑키", "개쉑히",
            "개쉢", "개쉨", "개쉬끼", "개쉬리", "개쉽", "개습", "개습세", "개습쌔",
            "개싀기", "개싀끼", "개싀밸", "개싀킈", "개싀키", "개싏", "개싑창", "개싘", "개시끼",
            "개시퀴", "개시키", "개식기", "개식끼", "개식히", "개십새", "개십팔", "개싯기", "개싯끼",
            "개싯키", "개싴", "개쌍넘", "개쌍년", "개쌍놈", "개쌍눔", "개쌍늠", "개쌍연", "개쌍영",
            "개쌔꺄", "개쌕", "개쌕끼", "개쌰깨", "개썅", "개쎄", "개쎅", "개쎼키",
            "개쐐리", "개쒜", "개쒝", "개쒯", "개쒸", "개쒸빨놈", "개쒹기", "개쓉", "개씀", "개씁",
            "개씌끼", "개씨끼", "개씨팕", "개씨팔", "개잡것", "개잡년", "개잡놈", "개잡뇬", "개젓",
            "개젖", "개젗", "개졋", "개조또", "개조옷", "개족", "개좃", "개좆", "개좇",
            "개지랄", "개지럴", "개창년", "개허러", "개허벌년", "개호러", "개호로", "개후랄", "개후레",
            "개후로", "개후장", "걔섀끼", "걔잡넘", "걔잡년", "걔잡뇬", "게가튼", "게같은", "게너마",
            "게년", "게노마", "게놈", "게뇨나", "게뇬", "게뇸", "게뇽", "게눔", "게늠", "게띠발넘",
            "게부랄", "게부알", "게새끼", "게새리", "게새키", "게색", "게색기", "게색끼", "게샛키",
            "게세꺄", "게자지", "게잡넘", "게잡년", "게잡뇬", "게젓", "게좆", "계같은뇬", "계뇬",
            "계뇽", "쉬댕", "쉬뎅", "개생끼"
    };
    private static final String[] MINOR_PROFANITY = {
            "ㅁㅊ", "ㅁ친", "ㅁ쳤", "aㅣ친", "me친", "미ㅊ", "di친",
            "미친놈", "미친새끼",
            "꼽냐", "꼽니", "꼽나",
            "뒤져", "뒈져", "뒈진", "뒈질", "디져라", "디진다", "디질래", "뒤질",
    };
    private static final String[] SEXUAL_PROFANITY = {
            "ⓑⓞⓩⓘ", "bozi", "보ㅈㅣ", "보지", "버지물", "버짓물", "보짓", "개보즤", "개보지", "버지벌렁벌렁", "보짖", "뵤즤", "봊이", "보g",
            "ja지", "ㅈㅈ빨", "자ㅈ", "ㅈ지빨", "자지", "자짓", "잦이", "쟈지",
            "sex", "s스", "x스", "se스", "s하고e싶다x", "ㅅㅔㅅㄱ", "이=스", "섹ㅅ", "세ㄱㅅ", "섹스", "섻", "쉑스", "섿스", "섹그", "야스", "색스", "셱스", "섁스", "세엑스", "썩스", "섹수", "섹파", "섹하자", "쉐스", "쉐엑스", "색수", "세엑수우", "섹하고", "섹하구", "섹하장", "섹하쟈", "섹한번", "쌕스",
            "꼬3", "꼬툭튀", "꼬톡튀", "불알", "부랄", "뽕알", "뿅알", "뿌랄", "뿔알", "개부달", "개부랄", "개부러럴", "개부럴", "개부뢀", "개부알", "개불알", "똘추", "똥구멍", "부라랄",
            "오나홍", "오나홀", "ㅇㄴ홀", "텐가", "바이브레이터", "오ㄴ홀", "ㅇ나홀", "씹하다", "매춘부", "성노예", "자궁문신",
            "모유물", "로리물", "근친상간", "룸섹스", "원조교재", "속박플레이", "야외플레이",
            "딸딸이", "질싸", "안에사정", "자위남", "자위녀", "폰섹", "포르노", "폰세엑", "폰쉑", "폰쎅", "질내사정", "그룹섹", "남창",
            "누워라이년아", "누웠냐씨방새", "다리벌려", "대줄년", "뒤로너어줘", "딸따뤼", "딸쳐", "떡쳐라", "막대쑤셔줘", "막대핥아줘", "먹고보니내딸", "먹고보니누나", "먹고보니딸", "먹고보니똥개", "먹고보니엄마", "먹고보니응아", "먹고보니재수", "먹고보니처제", "먹고보니형수", "몸뚱이줄께", "몸안에사정", "밖에다쌀께", "박고빼고", "배위에싸죠", "몸의대화", "섹할", "섹해",
            "g스팟", "지스팟", "크리토리스", "클리토리스", "페니스", "애널", "젖까", "젖가튼", "젖나", "젖만",
            "ja위", "자위", "고자새끼", "고츄", "꺼추", "꼬추",
    };
    private static final String[] BELITTLE_PROFANITY = {
            "10련", "따까리", "장애년", "찐따년", "싸가지", "창년", "썅년", "버러지", "고아년", "개간년", "종간나", "도구년", "걸래년", "씹년", "개걸레",
            "창녀", "머저리", "씹쓰래기", "씹쓰레기", "씹장생", "씹자식", "운지", "급식충", "틀딱충", "조센징", "매국노", "똥꼬충", "진지충", "듣보잡", "개찐따",
            "한남충", "정신병자", "중생아", "돌팔이", "김치녀", "폰팔이", "틀딱년", "같은년", "개돼중", "쓰글년", "썩을년", "썩글년", "씹할", "거지새끼", "거지쉐뀌",
            "거지쉑이", "거지쎄끼", "거지쒜리", "걸래가튼", "걸래넘", "걸래년", "걸래놈", "걸레가튼", "걸레년", "그지새끼", "그지새키", "그지색", "기집년", "까진년",
            "깔보", "난잡년", "빡대가리", "더러운년", "돌아이", "또라이", "장애려", "샹놈", "김치남", "김치녀", "혜지련", "한유남충", "페미나치", "페미년", "꼴페미",
    };
    private static final String[] RACE_PROFANITY = {
            "깜둥이", "흑형", "조센진", "짱개", "짱깨", "짱께", "짱게", "쪽바리", "쪽파리", "빨갱이", "니그로", "코쟁이", "칭총", "칭챙총", "섬숭이", "왜놈", "짱꼴라", "섬짱깨",
    };
    private static final String[] PARENT_PROFANITY = {
            "ㄴ1ㄱ", "ㄴ1ㅁ", "느금ㅁ", "ㄴㄱ마", "ㄴㄱ빠", "ㄴ금빠", "ㅇH미", "ㄴ1에미", "늬애미", "@ㅐ미", "@ㅐ비",
            "ㄴㄱㅁ", "ㄴ금마", "늬금마",
            "느금마", "느그엄마", "늑엄마", "늑금마", "느그애미", "넉엄마", "느그부모", "느그애비", "느금빠", "느그메", "느그빠", "니미씨", "니미씹",
            "느그마", "니엄마", "엄창", "엠창", "니미럴", "누굼마", "느금", "내미랄", "내미럴", "엄마없는", "아빠없는", "노에미",
            "니애미", "노애미", "노앰", "앰뒤련", "애믿쥐", "아버지없는게", "애미없는게", "애비없는게", "어머니없는게", "엄마없네", "니애비", "노애비", "애미없", "애비없", "애미뒤", "애비뒤",
            "니아빠", "너에미", "눼기미", "뉘귀미", "뉘기미", "뉘김이", "뉘뮈", "뉘미랄", "뉘미럴", "뉘미롤", "뉘밀얼", "뉘밀할", "뉘어미", "뉘에미",
            "느검마", "늬긔미", "늬기미", "니기미", "니믜창", "니미쒸블", "니미씨펄넘", "니미좃", "니밀할", "니부랑", "니뽕좃",
            "애미죽", "애미디진",
    };
    private static final String[] SPECIAL_PROFANITY = {"🖕🏻", "👌🏻👈🏻", "👉🏻👌🏻", "🤏🏻", "🖕", "🖕🏼", "🖕🏽", "🖕🏾", "🖕🏿", ":middle_finger:"};
    private static final String[] POLITICS_PROFANITY = {
            "노시개", "노알라", "뇌사모", "뇌물현", "응디시티",
            "귀걸이아빠", "달창", "대깨문", "문재앙", "문죄앙", "문죄인", "문크예거", "훠훠훠", "문빠",
            "근혜어", "길라임", "나대블츠", "닭근혜", "댓통령", "레이디가카", "바쁜벌꿀", "수첩공주", "유신공주", "유체이탈화법", "칠푼이", "쿼터갓",
            "반인반신", "데미갓", "박정희",
            "간철수",
            "가카", "이명박근혜", "다스는누구겁니까",
    };
}
