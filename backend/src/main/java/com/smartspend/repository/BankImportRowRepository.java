package com.smartspend.repository;

import com.smartspend.entity.BankImportRow;
import com.smartspend.entity.BankImportRow.RowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface BankImportRowRepository extends JpaRepository<BankImportRow, Long> {
    List<BankImportRow> findByBankImportIdOrderByRowIndexAsc(Long importId);
    List<BankImportRow> findByBankImportIdAndIdInOrderByRowIndexAsc(Long importId, Collection<Long> ids);

    @Query("""
        SELECT COUNT(r) > 0 FROM BankImportRow r
        WHERE r.bankImport.user.id = :userId
          AND r.duplicateHash = :hash
          AND r.status = :status
        """)
    boolean existsImportedHash(
            @Param("userId") Long userId,
            @Param("hash") String hash,
            @Param("status") RowStatus status);
}
