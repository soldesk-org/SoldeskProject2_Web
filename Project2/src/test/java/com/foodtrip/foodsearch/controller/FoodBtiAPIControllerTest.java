package com.foodtrip.foodsearch.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.foodtrip.foodsearch.service.FoodBtiProfileCatalog;
import com.foodtrip.foodsearch.service.FoodBtiService;
import com.foodtrip.foodsearch.service.FoodRecommendationService;

class FoodBtiAPIControllerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        FoodBtiService service = new FoodBtiService(
                new FoodBtiProfileCatalog(),
                new FoodRecommendationService());

        mockMvc = MockMvcBuilders
                .standaloneSetup(new FoodBtiAPIController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void 정상답변은_검색키워드를_포함한_결과를_반환한다() throws Exception {
        String requestBody = """
                {
                  "answer": [
                    "S", "S", "S",
                    "N", "N", "N",
                    "T", "T", "T",
                    "P", "P", "P"
                  ]
                }
                """;

        mockMvc.perform(post("/api/food-bti/result")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultType").value("SNTP"))
                .andExpect(jsonPath("$.traits.length()").value(4))
                .andExpect(jsonPath("$.recommendations.length()").value(5))
                .andExpect(jsonPath("$.recommendations[0].searchKeyword").isNotEmpty());
    }

    @Test
    void 질문축과_다른_답변은_400오류를_반환한다() throws Exception {
        String requestBody = """
                {
                  "answer": [
                    "N", "L", "L",
                    "F", "F", "F",
                    "A", "A", "A",
                    "P", "P", "P"
                  ]
                }
                """;

        mockMvc.perform(post("/api/food-bti/result")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_FOOD_BTI_ANSWER"))
                .andExpect(jsonPath("$.message").value("1번 질문은 L 또는 S만 선택할 수 있습니다."));
    }
}
