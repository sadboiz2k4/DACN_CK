package com.smartspend.dto.imports;

import lombok.Data;

@Data
public class BankImportMappingRequest {
    private String dateColumn;
    private String descriptionColumn;
    private String debitColumn;
    private String creditColumn;
    private String amountColumn;
    private String typeColumn;
    private String referenceColumn;
    private String balanceColumn;
}
