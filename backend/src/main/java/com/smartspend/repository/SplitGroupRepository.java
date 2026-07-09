package com.smartspend.repository;

import com.smartspend.entity.SplitGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SplitGroupRepository extends JpaRepository<SplitGroup, Long> {

    List<SplitGroup> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<SplitGroup> findByIdAndUserId(Long id, Long userId);

    @Query("""
            SELECT DISTINCT g FROM SplitGroup g
            LEFT JOIN g.members m
            WHERE g.user.id = :userId
               OR (m.user.id = :userId AND m.active = true)
            ORDER BY g.createdAt DESC
            """)
    List<SplitGroup> findVisibleToUser(@Param("userId") Long userId);

    @Query("""
            SELECT DISTINCT g FROM SplitGroup g
            LEFT JOIN g.members m
            WHERE g.id = :id
              AND (g.user.id = :userId OR (m.user.id = :userId AND m.active = true))
            """)
    Optional<SplitGroup> findVisibleByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
