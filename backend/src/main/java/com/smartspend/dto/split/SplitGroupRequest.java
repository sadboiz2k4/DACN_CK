package com.smartspend.dto.split;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class SplitGroupRequest {
    @NotBlank
    private String name;
    private String note;
    @Valid
    private List<SplitMemberRequest> members = new ArrayList<>();
}
