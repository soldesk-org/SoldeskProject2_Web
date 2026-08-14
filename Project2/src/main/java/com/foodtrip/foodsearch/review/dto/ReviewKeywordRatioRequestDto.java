package com.foodtrip.foodsearch.review.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record ReviewKeywordRatioRequestDto(
        @JsonProperty("place_ids")
        @NotEmpty
        @Size(max = 200)
        List<@NotBlank String> placeIds,
        @NotEmpty
        @Size(max = 50)
        List<@NotBlank String> keywords) {
}
