package com.smartspend.dto.split;

import lombok.Data;

@Data
public class SplitSettlementActionRequest {
    private Long walletId;
    private String note;
}
