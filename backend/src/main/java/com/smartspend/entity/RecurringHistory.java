package com.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity lưu lịch sử mỗi lần Scheduler tự động chạy cho một dịch vụ.
 * Ghi nhận cả SUCCESS lẫn FAILED để dễ debug và thông báo cho user.
 */
@Entity
@Table(name = "recurring_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecurringHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Dịch vụ định kỳ mà lịch sử này thuộc về */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recurring_payment_id", nullable = false)
    private RecurringPayment recurringPayment;

    /**
     * Transaction được tạo ra khi thanh toán thành công.
     * Null nếu thanh toán thất bại (ví không đủ tiền).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private Transaction transaction;

    @Column(name = "payment_date")
    private LocalDateTime paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private HistoryStatus status = HistoryStatus.SUCCESS;

    /** Lý do thất bại — chỉ có giá trị khi status = FAILED */
    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @PrePersist
    protected void onCreate() {
        if (paymentDate == null) paymentDate = LocalDateTime.now();
    }

    public enum HistoryStatus { SUCCESS, FAILED }
}
