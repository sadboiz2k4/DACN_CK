package com.smartspend.dto.category;

import com.smartspend.entity.Category.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CategoryRequest {
    @NotBlank
    private String name;

    @NotNull
    private CategoryType type;

    private String icon = "tag";
    private String color = "#6B7280";
}
