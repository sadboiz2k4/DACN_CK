package com.smartspend.dto.gamification;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class GamificationProfileResponse {
    private int totalPoints;
    private int level;
    private int pointsForCurrentLevel;
    private int pointsForNextLevel;
    private int levelProgress;
    private int currentStreak;
    private int bestStreak;
    private LocalDate lastActivityDate;
}
