package com.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "point_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PointEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ActionType action;

    @Column(nullable = false)
    private int points;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ActionType {
        TRANSACTION_CREATED,
        BUDGET_CREATED,
        BANK_IMPORT_COMPLETED,
        SPLIT_BILL_CREATED,
        SPLIT_BILL_SETTLED,
        BADGE_UNLOCKED
    }
}
