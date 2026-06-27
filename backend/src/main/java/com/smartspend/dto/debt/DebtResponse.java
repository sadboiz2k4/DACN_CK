package com.smartspend.dto.debt;

import com.smartspend.entity.Debt.DebtStatus;
import com.smartspend.entity.Debt.DebtType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO trả về thông tin một khoản nợ.
 * Khi dùng cho API danh sách: debtDetails = null.
 * Khi dùng cho API chi tiết: debtDetails chứa đủ timeline.
 */
@Data
@Builder
public class DebtResponse {

    private Long id;
    private Long walletId;
    private String walletName;
    private String lenderBorrowerName;
    private DebtType type;
    private BigDecimal amount;
    private BigDecimal remainAmount;
    /** Số tiền đã trả/thu = amount - remainAmount */
    private BigDecimal paidAmount;
    private String note;
    private LocalDate dueDate;
    private DebtStatus status;
    /** true nếu dueDate < today và status != PAID */
    private boolean overdue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Chỉ có khi gọi API chi tiết */
    private List<DebtDetailResponse> debtDetails;
}
