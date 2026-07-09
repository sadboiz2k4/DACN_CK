package com.smartspend.repository;

import com.smartspend.entity.SplitBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SplitBillRepository extends JpaRepository<SplitBill, Long> {

    Optional<SplitBill> findByIdAndUserId(Long id, Long userId);

    @Query("""
            SELECT DISTINCT b FROM SplitBill b
            LEFT JOIN b.group.members m
            WHERE b.id = :id
              AND (b.group.user.id = :userId OR (m.user.id = :userId AND m.active = true))
            """)
    Optional<SplitBill> findVisibleByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
