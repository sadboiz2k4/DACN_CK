package com.smartspend.dto.split;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class SplitBillParticipantResponse {
    private Long id;
    private Long memberId;
    private String memberName;
    private boolean currentUser;
    private BigDecimal paidAmount;
    private BigDecimal shareAmount;
    private BigDecimal sharePercent;
    private BigDecimal netAmount;
}
