package com.smartspend.dto.debt;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO nhận dữ liệu khi thêm một đợt trả nợ / thu nợ mới.
 * POST /api/debts/{id}/payments
 */
@Data
public class DebtPaymentRequest {

    @NotNull(message = "Ví không được để trống")
    private Long walletId;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1,000 VND")
    private BigDecimal payAmount;

    /** Ghi chú riêng cho đợt trả này (tuỳ chọn) */
    private String note;
}
