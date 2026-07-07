package com.smartspend.dto.split;

import com.smartspend.entity.SplitBill.BillStatus;
import com.smartspend.entity.SplitBill.SplitMode;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SplitBillResponse {
    private Long id;
    private Long groupId;
    private String groupName;
    private String title;
    private BigDecimal totalAmount;
    private LocalDate billDate;
    private String note;
    private SplitMode splitMode;
    private BillStatus status;
    private Long transactionId;
    private List<SplitBillParticipantResponse> participants;
    private List<SplitSettlementResponse> settlements;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
