package com.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity đại diện cho một khoản nợ trong Sổ nợ.
 * DEBT = Mình đi vay (phải trả), LOAN = Cho người khác vay (cần thu).
 */
@Entity
@Table(name = "debts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@NamedEntityGraphs({
    // Graph nhẹ: chỉ cần wallet (dùng cho danh sách)
    @NamedEntityGraph(
        name = "Debt.withWallet",
        attributeNodes = @NamedAttributeNode("wallet")
    ),
    // Graph đầy đủ: cần wallet + toàn bộ details với wallet & transaction của từng detail (dùng cho chi tiết)
    @NamedEntityGraph(
        name = "Debt.withWalletAndDetails",
        attributeNodes = {
            @NamedAttributeNode("wallet"),
            @NamedAttributeNode(value = "debtDetails", subgraph = "details-subgraph")
        },
        subgraphs = @NamedSubgraph(
            name = "details-subgraph",
            attributeNodes = {
                @NamedAttributeNode("wallet"),
                @NamedAttributeNode("transaction")
            }
        )
    )
})
public class Debt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Ví ban đầu: nơi nhận tiền (nếu DEBT) hoặc nơi xuất tiền (nếu LOAN)
     * khi khoản nợ được tạo lần đầu.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    /** Tên người cho vay (nếu DEBT) hoặc tên người vay (nếu LOAN) */
    @Column(name = "lender_borrower_name", nullable = false, length = 255)
    private String lenderBorrowerName;

    /** DEBT: Mình đi vay. LOAN: Mình cho người khác vay. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DebtType type;

    /** Tổng số tiền gốc ban đầu */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /**
     * Số tiền còn lại phải trả / cần thu.
     * Giảm dần sau mỗi lượt trả. Khi về 0 thì status chuyển PAID.
     */
    @Column(name = "remain_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal remainAmount;

    @Column(length = 500)
    private String note;

    /** Ngày hẹn trả. Dùng để scheduler hoặc FE check quá hạn. */
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DebtStatus status = DebtStatus.PARTIAL;

    /** Danh sách các đợt trả/thu nợ — được load khi cần (lazy) */
    @OneToMany(mappedBy = "debt", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<DebtDetail> debtDetails = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum DebtType {
        DEBT,  // Mình đi vay (người khác cho mình vay)
        LOAN   // Mình cho người khác vay
    }

    public enum DebtStatus {
        PARTIAL,  // Chưa trả hết / chưa thu hết
        PAID,     // Đã thanh toán đủ
        OVERDUE   // Đã quá hạn
    }
}
