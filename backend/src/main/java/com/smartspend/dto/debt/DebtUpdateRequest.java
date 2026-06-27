package com.smartspend.dto.debt;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO nhận dữ liệu khi sửa thông tin một khoản nợ.
 * PUT /api/debts/{id}
 *
 * Không cho phép đổi type (DEBT/LOAN) và walletId ban đầu vì sẽ
 * làm sai lệch toàn bộ lịch sử giao dịch gốc.
 * Chỉ cho phép chỉnh: tên, số tiền gốc, ngày hẹn trả, ghi chú.
 */
@Data
public class DebtUpdateRequest {

    @NotBlank(message = "Tên người vay/cho vay không được để trống")
    private String lenderBorrowerName;

    /**
     * Số tiền gốc mới.
     * Ràng buộc: amount mới >= (amount cũ - remainAmount cũ) tức là >= paidAmount.
     * Nghĩa là không được khai báo số tiền gốc nhỏ hơn số tiền đã trả rồi.
     */
    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1,000 VND")
    private BigDecimal amount;

    @NotNull(message = "Ngày hẹn trả không được để trống")
    private LocalDate dueDate;

    private String note;
}
