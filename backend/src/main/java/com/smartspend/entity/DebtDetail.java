package com.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity đại diện cho một đợt trả nợ / thu nợ cụ thể.
 * Mỗi bản ghi tương ứng 1:1 với một Transaction trong bảng transactions.
 * Dùng để vẽ Timeline lịch sử thanh toán.
 */
@Entity
@Table(name = "debt_details")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DebtDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Khoản nợ cha mà đợt trả này thuộc về */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_id", nullable = false)
    private Debt debt;

    /** Ví dùng để thực hiện giao dịch trả/thu lần này */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    /**
     * Transaction tương ứng được tạo tự động khi thêm đợt trả.
     * Dùng để trace dòng tiền.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    /** Số tiền trả/thu của riêng đợt này */
    @Column(name = "pay_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal payAmount;

    /** Thời điểm thực hiện đợt trả/thu này */
    @Column(name = "payment_date")
    private LocalDateTime paymentDate;

    /** Ghi chú riêng cho đợt trả (VD: "Trả đợt 1", "Tất toán") */
    @Column(length = 500)
    private String note;

    @PrePersist
    protected void onCreate() {
        if (paymentDate == null) {
            paymentDate = LocalDateTime.now();
        }
    }
}
