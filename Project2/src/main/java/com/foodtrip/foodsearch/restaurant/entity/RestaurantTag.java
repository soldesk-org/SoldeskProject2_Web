package com.foodtrip.foodsearch.restaurant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "restaurant_tags")
public class RestaurantTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "restaurant_tag_id")
    private Long restaurantTagId;

    @Column(name = "restaurant_id", nullable = false)
    private String restaurantId;

    @Column(name = "tag_id", nullable = false)
    private Long tagId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected RestaurantTag() {
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getRestaurantTagId() {
        return restaurantTagId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public Long getTagId() {
        return tagId;
    }
}
