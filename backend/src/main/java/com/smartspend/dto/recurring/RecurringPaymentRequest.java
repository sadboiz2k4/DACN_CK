package com.smartspend.dto.recurring;

import com.smartspend.entity.RecurringPayment.CycleType;
import com.smartspend.entity.RecurringPayment.PaymentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO nhận dữ liệu khi tạo mới dịch vụ định kỳ hoặc khoản trả góp.
 * Validation: nếu paymentType = INSTALLMENT thì totalMonths bắt buộc.
 * Ràng buộc này được kiểm tra trong Service layer.
 */
@Data
public class RecurringPaymentRequest {

    @NotBlank(message = "Tên dịch vụ không được để trống")
    private String name;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1,000 VND")
    private BigDecimal amount;

    @NotNull(message = "Ví không được để trống")
    private Long walletId;

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    @NotNull(message = "Loại thanh toán không được để trống")
    private PaymentType paymentType;   // RECURRING hoặc INSTALLMENT

    @NotNull(message = "Chu kỳ không được để trống")
    private CycleType cycleType;       // MONTHLY hoặc YEARLY

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    /**
     * Bắt buộc khi paymentType = INSTALLMENT.
     * Tổng số kỳ thanh toán (ví dụ: trả góp 12 tháng → totalMonths = 12).
     */
    @Min(value = 1, message = "Số kỳ tối thiểu là 1")
    private Integer totalMonths;
}
