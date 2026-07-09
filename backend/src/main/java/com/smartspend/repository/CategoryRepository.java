package com.smartspend.repository;

import com.smartspend.entity.Category;
import com.smartspend.entity.Category.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsByIsDefaultTrueAndTypeAndNameIgnoreCase(CategoryType type, String name);

    @Query("SELECT c FROM Category c WHERE c.isDefault = true OR c.user.id = :userId ORDER BY c.type, c.name")
    List<Category> findAllByUserId(Long userId);

    @Query("SELECT c FROM Category c WHERE (c.isDefault = true OR c.user.id = :userId) AND c.type = :type")
    List<Category> findByUserIdAndType(Long userId, CategoryType type);

    @Query("SELECT c FROM Category c WHERE (c.isDefault = true OR c.user.id = :userId) AND LOWER(c.name) = LOWER(:name)")
    Optional<Category> findByNameAndUserId(@Param("name") String name, @Param("userId") Long userId);
}
