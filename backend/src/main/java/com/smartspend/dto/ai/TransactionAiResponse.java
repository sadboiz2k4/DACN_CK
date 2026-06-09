package com.smartspend.dto.ai;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class TransactionAiResponse {
    private BigDecimal amount;
    private String type;
    private String categoryName;
    private String date;
    private String note;
}