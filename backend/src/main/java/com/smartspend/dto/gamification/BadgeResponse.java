package com.smartspend.dto.gamification;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BadgeResponse {
    private String code;
    private String name;
    private String description;
    private String icon;
    private int bonusPoints;
    private boolean earned;
    private LocalDateTime earnedAt;
}
