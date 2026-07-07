package com.smartspend.dto.split;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SplitBillParticipantRequest {
    @NotNull
    private Long memberId;
    private boolean included = true;
    private BigDecimal paidAmount = BigDecimal.ZERO;
    private BigDecimal shareAmount;
    private BigDecimal sharePercent;
}
