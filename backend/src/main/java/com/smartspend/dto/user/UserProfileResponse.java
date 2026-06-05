package com.smartspend.dto.user;

import com.smartspend.entity.User.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class UserProfileResponse {
    private Long id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private Role role;
    private LocalDateTime createdAt;
}
