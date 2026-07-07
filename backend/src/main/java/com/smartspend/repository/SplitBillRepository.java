package com.smartspend.repository;

import com.smartspend.entity.SplitBill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SplitBillRepository extends JpaRepository<SplitBill, Long> {

    Optional<SplitBill> findByIdAndUserId(Long id, Long userId);
}
