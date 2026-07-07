package com.smartspend.dto.split;

import com.smartspend.entity.SplitBill.SplitMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
public class SplitBillRequest {
    @NotBlank
    private String title;

    @NotNull
    @DecimalMin("1")
    private BigDecimal totalAmount;

    private LocalDate billDate;
    private String note;
    private SplitMode splitMode = SplitMode.EQUAL;
    private Long walletId;
    private Long categoryId;

    @Valid
    private List<SplitBillParticipantRequest> participants = new ArrayList<>();
}
