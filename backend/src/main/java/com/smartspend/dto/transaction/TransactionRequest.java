package com.smartspend.dto.transaction;

import com.smartspend.entity.Transaction.TransactionSource;
import com.smartspend.entity.Transaction.TransactionType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TransactionRequest {
    @NotNull @Positive
    private BigDecimal amount;

    @NotNull
    private TransactionType type;

    @NotNull
    private Long walletId;

    private Long categoryId;
    private String note;
    private LocalDate transactionDate;
    private Long toWalletId;
    private TransactionSource source = TransactionSource.MANUAL;
}
