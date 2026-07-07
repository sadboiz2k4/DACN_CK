package com.smartspend.repository;

import com.smartspend.entity.PointEvent;
import com.smartspend.entity.PointEvent.ActionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PointEventRepository extends JpaRepository<PointEvent, Long> {
    List<PointEvent> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndAction(Long userId, ActionType action);
    long countByUserIdAndActionAndCreatedAtBetween(Long userId, ActionType action, LocalDateTime start, LocalDateTime end);
}
