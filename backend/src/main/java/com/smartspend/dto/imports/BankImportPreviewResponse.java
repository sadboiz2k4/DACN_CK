package com.smartspend.dto.imports;

import com.smartspend.entity.BankImport.ImportStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BankImportPreviewResponse {
    private Long importId;
    private String fileName;
    private ImportStatus status;
    private List<String> headers;
    private BankImportMappingRequest suggestedMapping;
    private List<BankImportRowPreviewResponse> rows;
    private int totalRows;
    private int importedRows;
    private int duplicateRows;
    private int errorRows;
}
