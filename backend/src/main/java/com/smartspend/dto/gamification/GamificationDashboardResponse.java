package com.smartspend.dto.gamification;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GamificationDashboardResponse {
    private GamificationProfileResponse profile;
    private List<BadgeResponse> badges;
    private List<MissionResponse> missions;
    private List<PointEventResponse> recentEvents;
}
