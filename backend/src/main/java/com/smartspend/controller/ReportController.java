package com.smartspend.controller;

import com.smartspend.entity.User;
import com.smartspend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(reportService.getSummary(user, period));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Map<String, Object>>> getCategoryBreakdown(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(reportService.getCategoryBreakdown(user, period));
    }

    @GetMapping("/timeline")
    public ResponseEntity<List<Map<String, Object>>> getTimeline(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(reportService.getTimeline(user, period));
    }

    @GetMapping("/monthly-trend")
    public ResponseEntity<List<Map<String, Object>>> getMonthlyTrend(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(reportService.getMonthlyTrend(user));
    }
}
