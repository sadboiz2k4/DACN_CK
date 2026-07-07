package com.smartspend.dto.imports;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class BankImportConfirmRequest {
    @NotNull
    private Long walletId;

    @Valid
    @NotNull
    private BankImportMappingRequest mapping;

    private List<Long> selectedRowIds;
    private Map<Long, String> categoryOverrides;
}
