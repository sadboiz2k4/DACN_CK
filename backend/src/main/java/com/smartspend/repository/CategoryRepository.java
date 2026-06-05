package com.smartspend.repository;

import com.smartspend.entity.Category;
import com.smartspend.entity.Category.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    @Query("SELECT c FROM Category c WHERE c.isDefault = true OR c.user.id = :userId ORDER BY c.type, c.name")
    List<Category> findAllByUserId(Long userId);

    @Query("SELECT c FROM Category c WHERE (c.isDefault = true OR c.user.id = :userId) AND c.type = :type")
    List<Category> findByUserIdAndType(Long userId, CategoryType type);
}
