package com.smartspend.dto.debt;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO trả về thông tin một đợt trả/thu nợ.
 * Dùng để render Timeline lịch sử thanh toán trên Frontend.
 * paymentDate giữ đầy đủ timestamp để FE sort và hiển thị giờ/phút.
 */
@Data
@Builder
public class DebtDetailResponse {

    private Long id;
    private Long walletId;
    private String walletName;
    private Long transactionId;
    /** Loại giao dịch: EXPENSE (trả nợ) hoặc INCOME (thu nợ) */
    private String transactionType;
    private BigDecimal payAmount;
    private LocalDateTime paymentDate;
    private String note;
}
