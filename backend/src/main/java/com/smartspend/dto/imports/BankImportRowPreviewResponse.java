package com.smartspend.dto.imports;

import com.smartspend.entity.BankImportRow.RowStatus;
import com.smartspend.entity.Transaction.TransactionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
public class BankImportRowPreviewResponse {
    private Long id;
    private int rowIndex;
    private Map<String, String> rawData;
    private LocalDate transactionDate;
    private String description;
    private BigDecimal amount;
    private TransactionType type;
    private String categoryName;
    private String referenceCode;
    private RowStatus status;
    private String errorMessage;
    private boolean selected;
}
