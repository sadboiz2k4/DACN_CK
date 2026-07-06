package com.smartspend.repository;

import com.smartspend.entity.RecurringPayment;
import com.smartspend.entity.RecurringPayment.PaymentType;
import com.smartspend.entity.RecurringPayment.RecurringStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, Long> {

    /**
     * Lấy danh sách dịch vụ của user với bộ lọc tùy chọn theo loại và trạng thái.
     * EntityGraph load sẵn wallet + category trong 1 query để tránh N+1.
     */
    @EntityGraph(value = "RecurringPayment.withWalletAndCategory")
    @Query("""
        SELECT r FROM RecurringPayment r
        WHERE r.user.id = :userId
          AND (:paymentType IS NULL OR r.paymentType = :paymentType)
          AND (:status IS NULL OR r.status = :status)
        ORDER BY r.nextPaymentDate ASC
        """)
    Page<RecurringPayment> findByUserIdWithFilters(
            @Param("userId") Long userId,
            @Param("paymentType") PaymentType paymentType,
            @Param("status") RecurringStatus status,
            Pageable pageable);

    /**
     * Tìm dịch vụ theo id và userId để kiểm tra quyền sở hữu.
     */
    @EntityGraph(value = "RecurringPayment.withWalletAndCategory")
    @Query("SELECT r FROM RecurringPayment r WHERE r.id = :id AND r.user.id = :userId")
    Optional<RecurringPayment> findByIdAndUserId(
            @Param("id") Long id,
            @Param("userId") Long userId);

    /**
     * Query dành cho Scheduler: lấy toàn bộ dịch vụ ACTIVE có nextPaymentDate <= hôm nay.
     * JOIN FETCH wallet để Scheduler có thể kiểm tra balance ngay mà không phát sinh thêm query.
     * JOIN FETCH category và user để tạo Transaction không cần thêm query.
     */
    @Query("""
        SELECT r FROM RecurringPayment r
        JOIN FETCH r.wallet
        JOIN FETCH r.category
        JOIN FETCH r.user
        WHERE r.status = 'ACTIVE'
          AND r.nextPaymentDate <= :today
        """)
    List<RecurringPayment> findAllDueForProcessing(@Param("today") LocalDate today);


    @Query("SELECT r FROM RecurringPayment r JOIN FETCH r.wallet JOIN FETCH r.category JOIN FETCH r.user WHERE r.id = :id")
    Optional<RecurringPayment> findByIdWithDetails(@Param("id") Long id);
}
