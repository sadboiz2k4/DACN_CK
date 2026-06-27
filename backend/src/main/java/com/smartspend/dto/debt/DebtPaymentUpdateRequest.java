package com.smartspend.dto.debt;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO nhận dữ liệu khi sửa một đợt trả nợ.
 * PUT /api/debt-details/{detailId}
 */
@Data
public class DebtPaymentUpdateRequest {

    @NotNull(message = "Ví không được để trống")
    private Long walletId;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1,000 VND")
    private BigDecimal payAmount;

    /** Ghi chú (tuỳ chọn) */
    private String note;
}
