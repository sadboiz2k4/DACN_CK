package com.smartspend.dto.gamification;

import com.smartspend.entity.PointEvent.ActionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PointEventResponse {
    private Long id;
    private ActionType action;
    private int points;
    private String title;
    private String description;
    private LocalDateTime createdAt;
}
