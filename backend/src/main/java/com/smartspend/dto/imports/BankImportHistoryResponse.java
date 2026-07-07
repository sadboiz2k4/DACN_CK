package com.smartspend.dto.imports;

import com.smartspend.entity.BankImport.ImportStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BankImportHistoryResponse {
    private Long id;
    private String fileName;
    private String walletName;
    private ImportStatus status;
    private int totalRows;
    private int importedRows;
    private int duplicateRows;
    private int errorRows;
    private LocalDateTime createdAt;
    private LocalDateTime importedAt;
    private LocalDateTime rolledBackAt;
}
