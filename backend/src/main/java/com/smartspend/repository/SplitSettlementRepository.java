package com.smartspend.repository;

import com.smartspend.entity.SplitSettlement;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SplitSettlementRepository extends JpaRepository<SplitSettlement, Long> {

    @EntityGraph(attributePaths = {"bill", "bill.group", "fromMember", "toMember"})
    @Query("SELECT s FROM SplitSettlement s WHERE s.id = :id AND s.bill.user.id = :userId")
    Optional<SplitSettlement> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
