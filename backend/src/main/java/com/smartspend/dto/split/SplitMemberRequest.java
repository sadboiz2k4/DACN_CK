package com.smartspend.dto.split;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SplitMemberRequest {
    @NotBlank
    private String displayName;
    private String email;
    private String bankCode;
    private String bankAccountNumber;
    private String bankAccountName;
    private boolean currentUser;
}
