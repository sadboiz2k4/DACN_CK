package com.smartspend.controller;

import com.smartspend.dto.gamification.GamificationDashboardResponse;
import com.smartspend.entity.User;
import com.smartspend.service.GamificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gamification")
@RequiredArgsConstructor
public class GamificationController {

    private final GamificationService gamificationService;

    @GetMapping
    public ResponseEntity<GamificationDashboardResponse> getDashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(gamificationService.getDashboard(user));
    }

    @PostMapping("/refresh")
    public ResponseEntity<GamificationDashboardResponse> refresh(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(gamificationService.refresh(user));
    }
}
