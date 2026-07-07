package com.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bank_imports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankImport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id")
    private Wallet wallet;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ImportStatus status = ImportStatus.DRAFT;

    @Column(name = "total_rows")
    private int totalRows;

    @Column(name = "imported_rows")
    private int importedRows;

    @Column(name = "duplicate_rows")
    private int duplicateRows;

    @Column(name = "error_rows")
    private int errorRows;

    @OneToMany(mappedBy = "bankImport", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BankImportRow> rows = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "imported_at")
    private LocalDateTime importedAt;

    @Column(name = "rolled_back_at")
    private LocalDateTime rolledBackAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ImportStatus {
        DRAFT, IMPORTED, ROLLED_BACK
    }
}
