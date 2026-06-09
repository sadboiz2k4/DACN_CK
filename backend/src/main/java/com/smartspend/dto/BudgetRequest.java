package com.smartspend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class BudgetRequest {
    private String categoryName;
    private BigDecimal limitAmount;
    private int month;
    private int year;
}
