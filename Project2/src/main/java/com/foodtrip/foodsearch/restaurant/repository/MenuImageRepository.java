package com.foodtrip.foodsearch.restaurant.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.restaurant.entity.MenuImage;

public interface MenuImageRepository extends JpaRepository<MenuImage, Long> {

    List<MenuImage> findByMenuIdOrderByMenuImageIdAsc(Long menuId);

    List<MenuImage> findByMenuIdInOrderByMenuImageIdAsc(List<Long> menuIds);

    long countByMenuId(Long menuId);

    void deleteByMenuId(Long menuId);
}
