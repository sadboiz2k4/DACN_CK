package com.smartspend.repository;

import com.smartspend.entity.Debt;
import com.smartspend.entity.Debt.DebtStatus;
import com.smartspend.entity.Debt.DebtType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DebtRepository extends JpaRepository<Debt, Long> {

    /**
     * Lấy danh sách nợ theo user + filter tùy chọn theo type và status.
     * Dùng EntityGraph "Debt.withWallet" để JOIN FETCH wallet trong 1 câu query, tránh N+1.
     */
    @EntityGraph(value = "Debt.withWallet")
    @Query("""
        SELECT d FROM Debt d
        WHERE d.user.id = :userId
          AND (:type IS NULL OR d.type = :type)
          AND (:status IS NULL OR d.status = :status)
        ORDER BY d.createdAt DESC
        """)
    Page<Debt> findByUserIdWithFilters(
            @Param("userId") Long userId,
            @Param("type") DebtType type,
            @Param("status") DebtStatus status,
            Pageable pageable);

    /**
     * Lấy chi tiết 1 khoản nợ kèm toàn bộ debt_details, wallet của detail, và transaction.
     * Dùng EntityGraph "Debt.withWalletAndDetails" — 1 query duy nhất, không N+1.
     */
    @EntityGraph(value = "Debt.withWalletAndDetails")
    @Query("SELECT d FROM Debt d WHERE d.id = :id AND d.user.id = :userId")
    Optional<Debt> findByIdAndUserIdWithDetails(
            @Param("id") Long id,
            @Param("userId") Long userId);

    /**
     * Tìm khoản nợ theo id + userId (dùng cho các thao tác write, không cần load details).
     */
    @EntityGraph(value = "Debt.withWallet")
    @Query("SELECT d FROM Debt d WHERE d.id = :id AND d.user.id = :userId")
    Optional<Debt> findByIdAndUserId(
            @Param("id") Long id,
            @Param("userId") Long userId);
}
