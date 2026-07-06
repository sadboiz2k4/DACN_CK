package com.smartspend.dto.recurring;

import com.smartspend.entity.RecurringHistory.HistoryStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO trả về một bản ghi lịch sử thanh toán tự động.
 */
@Data
@Builder
public class RecurringHistoryResponse {

    private Long id;
    private Long recurringPaymentId;
    private String recurringPaymentName;

    /** ID transaction — null nếu thanh toán thất bại */
    private Long transactionId;

    private LocalDateTime paymentDate;
    private HistoryStatus status;

    /** Lý do thất bại — null nếu SUCCESS */
    private String failureReason;
}
