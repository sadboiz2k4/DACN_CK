package com.smartspend.repository;

import com.smartspend.entity.BankImport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BankImportRepository extends JpaRepository<BankImport, Long> {
    List<BankImport> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<BankImport> findByIdAndUserId(Long id, Long userId);
}
