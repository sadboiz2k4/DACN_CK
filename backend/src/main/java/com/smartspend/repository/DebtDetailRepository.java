package com.smartspend.repository;

import com.smartspend.entity.DebtDetail;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DebtDetailRepository extends JpaRepository<DebtDetail, Long> {

    /**
     * Tìm DebtDetail theo id, kèm theo khoản nợ cha (debt) + wallet + transaction.
     * Dùng LEFT JOIN FETCH để tránh N+1 khi cần check ownership qua debt.user.
     */
    @Query("""
        SELECT dd FROM DebtDetail dd
        LEFT JOIN FETCH dd.debt d
        LEFT JOIN FETCH d.wallet
        LEFT JOIN FETCH dd.wallet
        LEFT JOIN FETCH dd.transaction
        WHERE dd.id = :id
        """)
    Optional<DebtDetail> findByIdWithDebtAndWalletAndTransaction(@Param("id") Long id);
}
