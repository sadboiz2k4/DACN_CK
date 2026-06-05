package com.smartspend.dto.transaction;

import com.smartspend.entity.Transaction.TransactionSource;
import com.smartspend.entity.Transaction.TransactionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class TransactionResponse {
    private Long id;
    private BigDecimal amount;
    private TransactionType type;
    private String walletName;
    private Long walletId;
    private String categoryName;
    private String categoryIcon;
    private String categoryColor;
    private Long categoryId;
    private String note;
    private LocalDate transactionDate;
    private TransactionSource source;
    private String toWalletName;
    private LocalDateTime createdAt;
}
