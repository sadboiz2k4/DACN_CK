package com.smartspend.repository;

import com.smartspend.entity.SplitGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SplitGroupRepository extends JpaRepository<SplitGroup, Long> {

    List<SplitGroup> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<SplitGroup> findByIdAndUserId(Long id, Long userId);
}
