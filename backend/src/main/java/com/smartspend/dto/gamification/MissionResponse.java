package com.smartspend.dto.gamification;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MissionResponse {
    private String code;
    private String title;
    private String description;
    private int progress;
    private int target;
    private int rewardPoints;
    private boolean completed;
}
