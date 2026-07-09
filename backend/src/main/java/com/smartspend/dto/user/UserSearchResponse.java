package com.smartspend.dto.user;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserSearchResponse {
    private Long id;
    private String email;
    private String fullName;
    private String avatarUrl;
}
