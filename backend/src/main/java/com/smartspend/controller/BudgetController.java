package com.smartspend.controller;

import com.smartspend.dto.BudgetProgressResponse;
import com.smartspend.dto.BudgetRequest;
import com.smartspend.entity.User;
import com.smartspend.service.BudgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BudgetController {

    private final BudgetService budgetService;

    @GetMapping
    public ResponseEntity<List<BudgetProgressResponse>> getBudgets(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int month,
            @RequestParam(defaultValue = "0") int year) {
        if (month == 0) month = LocalDate.now().getMonthValue();
        if (year == 0) year = LocalDate.now().getYear();
        return ResponseEntity.ok(budgetService.getBudgetProgress(user, month, year));
    }

    @PostMapping
    public ResponseEntity<?> upsertBudget(
            @AuthenticationPrincipal User user,
            @RequestBody BudgetRequest req) {
        return ResponseEntity.ok(budgetService.upsertBudget(user, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBudget(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        budgetService.deleteBudget(user, id);
        return ResponseEntity.ok().build();
    }
}
