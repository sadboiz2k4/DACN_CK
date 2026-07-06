package com.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity đại diện cho một dịch vụ đăng ký định kỳ hoặc khoản trả góp.
 * RECURRING: Dịch vụ lặp lại vô hạn (Netflix, điện, nước...).
 * INSTALLMENT: Trả góp có số kỳ cố định (total_months kỳ).
 */
@Entity
@Table(name = "recurring_payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@NamedEntityGraphs({
    // Graph nhẹ dùng cho danh sách: cần wallet + category để hiển thị thông tin
    @NamedEntityGraph(
        name = "RecurringPayment.withWalletAndCategory",
        attributeNodes = {
            @NamedAttributeNode("wallet"),
            @NamedAttributeNode("category")
        }
    )
})
public class RecurringPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    /** Tên dịch vụ (VD: "Netflix", "Tiền thuê nhà") */
    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /** RECURRING: định kỳ mãi mãi | INSTALLMENT: trả góp có kỳ hạn */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private PaymentType paymentType;

    /** MONTHLY: hàng tháng | YEARLY: hàng năm */
    @Enumerated(EnumType.STRING)
    @Column(name = "cycle_type", nullable = false, length = 10)
    private CycleType cycleType;

    /** Ngày bắt đầu dịch vụ */
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** Ngày thanh toán kỳ tiếp theo — Scheduler sẽ dùng trường này để quét */
    @Column(name = "next_payment_date", nullable = false)
    private LocalDate nextPaymentDate;

    /** Tổng số kỳ (chỉ dùng cho INSTALLMENT, null nếu là RECURRING) */
    @Column(name = "total_months")
    private Integer totalMonths;

    /** Số kỳ đã thanh toán thành công */
    @Column(name = "paid_months")
    private Integer paidMonths = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private RecurringStatus status = RecurringStatus.ACTIVE;

    /** Lịch sử thanh toán tự động */
    @OneToMany(mappedBy = "recurringPayment", cascade = CascadeType.ALL,
               fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<RecurringHistory> histories = new ArrayList<>();

    public enum PaymentType { RECURRING, INSTALLMENT }
    public enum CycleType   { MONTHLY, YEARLY }
    public enum RecurringStatus { ACTIVE, PAUSED, COMPLETED }
}
