package com.smartspend.dto.admin;

import com.smartspend.entity.User.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class UserAdminResponse {
    private Long id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private Role role;
    private boolean isActive;
    private LocalDateTime createdAt;
    private long walletCount;
    private long transactionCount;
}
