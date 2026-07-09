package com.smartspend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "split_group_members")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SplitGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private SplitGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(length = 255)
    private String email;

    @Column(length = 500)
    private String note;

    @Column(name = "bank_code", length = 30)
    private String bankCode;

    @Column(name = "bank_account_number", length = 80)
    private String bankAccountNumber;

    @Column(name = "bank_account_name", length = 255)
    private String bankAccountName;

    @Column(name = "is_current_user")
    private boolean currentUser = false;

    @Column(name = "is_active")
    private boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
