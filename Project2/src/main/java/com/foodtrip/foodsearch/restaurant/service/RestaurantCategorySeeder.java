package com.foodtrip.foodsearch.restaurant.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.restaurant.entity.MenuKeyword;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantCategory;
import com.foodtrip.foodsearch.restaurant.repository.MenuKeywordRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantCategoryRepository;

// 팀이 전달한 키워드 마스터(web_menu_keyword_db.xlsx, 2026-07-21 도입)를 CSV로 옮겨 담은 리소스를 서버
// 기동 시 DB로 시딩한다 — 개인 PC의 "카카오톡 받은 파일" 경로에 의존하지 않도록 리포지토리 안에 CSV로
// 고정해뒀다(resources/data/restaurant-categories.csv, menu-keywords.csv). category_code가 없는 임시
// 테스트 카테고리(2026-07-21 지도 테스트 페이지용으로 급하게 넣었던 것)는 이 시더가 정리하고 공식
// 11개로 교체한다. 멱등하게 동작 — 이미 있는 category_code/keyword_ko는 다시 넣지 않는다.
@Component
public class RestaurantCategorySeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RestaurantCategorySeeder.class);

    private final RestaurantCategoryRepository restaurantCategoryRepository;
    private final MenuKeywordRepository menuKeywordRepository;

    public RestaurantCategorySeeder(RestaurantCategoryRepository restaurantCategoryRepository,
                                     MenuKeywordRepository menuKeywordRepository) {
        this.restaurantCategoryRepository = restaurantCategoryRepository;
        this.menuKeywordRepository = menuKeywordRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        seedCategories();
        seedKeywords();
    }

    private void seedCategories() throws IOException {
        // category_code 없는 행(2026-07-21 지도 테스트용으로 임시로 넣었던 6개)은 공식 목록이 아니므로 정리.
        restaurantCategoryRepository.findAll().stream()
                .filter(c -> c.getCategoryCode() == null)
                .forEach(restaurantCategoryRepository::delete);

        List<String[]> rows = readCsv("data/restaurant-categories.csv");
        int inserted = 0;
        for (String[] row : rows) {
            String categoryCode = row[0];
            if (restaurantCategoryRepository.findByCategoryCode(categoryCode).isPresent()) {
                continue;
            }
            String categoryNameKo = row[1];
            int displayOrder = Integer.parseInt(row[2]);
            restaurantCategoryRepository.save(RestaurantCategory.createOfficial(categoryCode, categoryNameKo, displayOrder));
            inserted++;
        }
        if (inserted > 0) {
            log.info("restaurant_categories 공식 목록 {}건 시딩 완료.", inserted);
        }
    }

    private void seedKeywords() throws IOException {
        if (menuKeywordRepository.count() > 0) {
            return;
        }
        List<String[]> rows = readCsv("data/menu-keywords.csv");
        List<MenuKeyword> keywords = new ArrayList<>(rows.size());
        for (String[] row : rows) {
            // category_code,keyword_group_code,keyword_group_name_ko,keyword_ko,normalized_keyword_ko,
            // keyword_type,match_scope,search_weight,is_active
            keywords.add(MenuKeyword.createFromSeed(
                    row[0], row[1], row[2], row[3], row[4], row[5], row[6],
                    Integer.parseInt(row[7]), Boolean.parseBoolean(row[8])));
        }
        menuKeywordRepository.saveAll(keywords);
        log.info("menu_keywords {}건 시딩 완료.", keywords.size());
    }

    private List<String[]> readCsv(String classpathLocation) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(classpathLocation).getInputStream(), StandardCharsets.UTF_8))) {
            String line = reader.readLine(); // header
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                rows.add(line.split(",", -1));
            }
        }
        return rows;
    }
}
