package com.smartspend.dto.split;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SplitMemberResponse {
    private Long id;
    private Long userId;
    private String displayName;
    private String email;
    private String note;
    private String bankCode;
    private String bankAccountNumber;
    private String bankAccountName;
    private boolean currentUser;
    private boolean linkedUser;
    private boolean active;
}
