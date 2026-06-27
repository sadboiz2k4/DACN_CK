package com.smartspend.dto.debt;

import com.smartspend.entity.Debt.DebtType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO nhận dữ liệu khi tạo mới một khoản nợ.
 */
@Data
public class DebtRequest {

    @NotNull(message = "Ví không được để trống")
    private Long walletId;

    @NotBlank(message = "Tên người vay/cho vay không được để trống")
    private String lenderBorrowerName;

    @NotNull(message = "Loại nợ không được để trống")
    private DebtType type;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1,000 VND")
    private BigDecimal amount;

    private String note;

    @NotNull(message = "Ngày hẹn trả không được để trống")
    @FutureOrPresent(message = "Ngày hẹn trả phải từ hôm nay trở về sau")
    private LocalDate dueDate;
}
