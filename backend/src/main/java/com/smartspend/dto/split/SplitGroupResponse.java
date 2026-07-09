package com.smartspend.dto.split;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SplitGroupResponse {
    private Long id;
    private Long ownerId;
    private String ownerName;
    private boolean owner;
    private String name;
    private String note;
    private BigDecimal amountToPay;
    private BigDecimal amountToReceive;
    private int openBillCount;
    private List<SplitMemberResponse> members;
    private List<SplitBillResponse> bills;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
