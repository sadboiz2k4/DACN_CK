package com.smartspend.dto.recurring;

import com.smartspend.entity.RecurringPayment.CycleType;
import com.smartspend.entity.RecurringPayment.PaymentType;
import com.smartspend.entity.RecurringPayment.RecurringStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO trả về thông tin một dịch vụ định kỳ / trả góp.
 */
@Data
@Builder
public class RecurringPaymentResponse {

    private Long id;
    private String name;
    private BigDecimal amount;

    private Long walletId;
    private String walletName;

    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
    private String categoryColor;

    private PaymentType paymentType;
    private CycleType cycleType;
    private LocalDate startDate;
    private LocalDate nextPaymentDate;

    /** null nếu RECURRING (không có kỳ hạn) */
    private Integer totalMonths;
    private Integer paidMonths;

    /** Số kỳ còn lại (null nếu RECURRING) */
    private Integer remainingMonths;

    private RecurringStatus status;

    /**
     * Phần trăm tiến độ trả góp (0-100).
     * null nếu là RECURRING.
     */
    private Integer progressPercent;
}
