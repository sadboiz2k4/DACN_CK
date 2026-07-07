package com.smartspend.entity;

import com.smartspend.entity.Transaction.TransactionType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "bank_import_rows", indexes = {
        @Index(name = "idx_bank_import_row_hash", columnList = "duplicate_hash")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankImportRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_id", nullable = false)
    private BankImport bankImport;

    @Column(name = "row_index", nullable = false)
    private int rowIndex;

    @Lob
    @Column(name = "raw_data_json", nullable = false, columnDefinition = "TEXT")
    private String rawDataJson;

    @Column(name = "transaction_date")
    private LocalDate transactionDate;

    @Column(length = 700)
    private String description;

    @Column(precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TransactionType type;

    @Column(name = "category_name", length = 255)
    private String categoryName;

    @Column(name = "reference_code", length = 255)
    private String referenceCode;

    @Column(name = "duplicate_hash", length = 128)
    private String duplicateHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RowStatus status = RowStatus.RAW;

    @Column(name = "error_message", length = 700)
    private String errorMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private Transaction transaction;

    public enum RowStatus {
        RAW, READY, IMPORTED, DUPLICATE, ERROR, SKIPPED, ROLLED_BACK
    }
}
