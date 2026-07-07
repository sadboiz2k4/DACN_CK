package com.smartspend.dto.split;

import com.smartspend.entity.SplitSettlement.SettlementStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class SplitSettlementResponse {
    private Long id;
    private Long billId;
    private Long fromMemberId;
    private String fromMemberName;
    private boolean fromCurrentUser;
    private Long toMemberId;
    private String toMemberName;
    private boolean toCurrentUser;
    private String toBankCode;
    private String toBankAccountNumber;
    private String toBankAccountName;
    private BigDecimal amount;
    private SettlementStatus status;
    private String qrUrl;
    private String paymentContent;
    private String paymentNote;
    private LocalDateTime markedPaidAt;
    private LocalDateTime confirmedAt;
}
