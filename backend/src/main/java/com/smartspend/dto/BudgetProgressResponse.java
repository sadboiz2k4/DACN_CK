package com.smartspend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BudgetProgressResponse {
    private Long id;
    private String categoryName;
    private BigDecimal limitAmount;
    private BigDecimal spentAmount;
    private double percentage;
    private boolean exceeded;
    private int month;
    private int year;
}
