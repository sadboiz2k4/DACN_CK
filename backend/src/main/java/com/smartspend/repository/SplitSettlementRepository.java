package com.smartspend.repository;

import com.smartspend.entity.SplitSettlement;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SplitSettlementRepository extends JpaRepository<SplitSettlement, Long> {

    @EntityGraph(attributePaths = {"bill", "bill.group", "bill.group.members", "fromMember", "fromMember.user", "toMember", "toMember.user"})
    @Query("""
            SELECT DISTINCT s FROM SplitSettlement s
            LEFT JOIN s.bill.group.members m
            WHERE s.id = :id
              AND (s.bill.group.user.id = :userId OR (m.user.id = :userId AND m.active = true))
            """)
    Optional<SplitSettlement> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
