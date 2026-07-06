package com.smartspend.dto.recurring;

import com.smartspend.entity.RecurringPayment.RecurringStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO nhận dữ liệu khi cập nhật dịch vụ định kỳ.
 * Chỉ cho phép sửa: số tiền, ví, trạng thái (ACTIVE/PAUSED).
 * Không cho phép đổi loại (paymentType), chu kỳ, hay ngày bắt đầu để tránh lệch lịch.
 */
@Data
public class RecurringPaymentUpdateRequest {

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1,000 VND")
    private BigDecimal amount;

    @NotNull(message = "Ví không được để trống")
    private Long walletId;

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    /** Chỉ chấp nhận ACTIVE hoặc PAUSED, không thể set COMPLETED thủ công */
    @NotNull(message = "Trạng thái không được để trống")
    private RecurringStatus status;
}
