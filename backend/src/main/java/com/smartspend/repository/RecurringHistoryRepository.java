package com.smartspend.repository;

import com.smartspend.entity.RecurringHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecurringHistoryRepository extends JpaRepository<RecurringHistory, Long> {

    /**
     * Lấy lịch sử thanh toán của một dịch vụ cụ thể, sắp xếp mới nhất trước.
     * JOIN FETCH transaction để tránh N+1 khi render lịch sử.
     */
    @Query("""
        SELECT h FROM RecurringHistory h
        LEFT JOIN FETCH h.transaction
        WHERE h.recurringPayment.id = :recurringId
        ORDER BY h.paymentDate DESC
        """)
    Page<RecurringHistory> findByRecurringPaymentId(
            @Param("recurringId") Long recurringId,
            Pageable pageable);
}
