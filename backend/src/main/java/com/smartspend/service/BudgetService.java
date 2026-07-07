package com.smartspend.service;

import com.smartspend.dto.BudgetProgressResponse;
import com.smartspend.dto.BudgetRequest;
import com.smartspend.entity.Budget;
import com.smartspend.entity.PointEvent.ActionType;
import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.entity.User;
import com.smartspend.repository.BudgetRepository;
import com.smartspend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final GamificationService gamificationService;

    public List<BudgetProgressResponse> getBudgetProgress(User user, int month, int year) {
        List<Budget> budgets = budgetRepository.findByUserIdAndMonthAndYear(user.getId(), month, year);

        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        return budgets.stream().map(budget -> {
            BigDecimal spent = transactionRepository.sumByUserIdAndCategoryNameAndTypeAndDateRange(
                    user.getId(), budget.getCategoryName(), TransactionType.EXPENSE, start, end);
            if (spent == null) spent = BigDecimal.ZERO;

            double pct = budget.getLimitAmount().doubleValue() > 0
                    ? (spent.doubleValue() / budget.getLimitAmount().doubleValue()) * 100
                    : 0;

            return new BudgetProgressResponse(
                    budget.getId(),
                    budget.getCategoryName(),
                    budget.getLimitAmount(),
                    spent,
                    Math.min(pct, 100),
                    spent.compareTo(budget.getLimitAmount()) > 0,
                    month,
                    year
            );
        }).collect(Collectors.toList());
    }

    public Budget upsertBudget(User user, BudgetRequest req) {
        var existingBudget = budgetRepository.findByUserIdAndCategoryNameAndMonthAndYear(
                user.getId(), req.getCategoryName(), req.getMonth(), req.getYear());
        boolean isNew = existingBudget.isEmpty();
        Budget budget = existingBudget.orElse(Budget.builder()
                        .user(user)
                        .categoryName(req.getCategoryName())
                        .month(req.getMonth())
                        .year(req.getYear())
                        .build());
        budget.setLimitAmount(req.getLimitAmount());
        budget = budgetRepository.save(budget);
        if (isNew) {
            gamificationService.awardPoints(
                user,
                ActionType.BUDGET_CREATED,
                15,
                "Đặt ngân sách",
                "Bạn vừa tạo hoặc cập nhật giới hạn chi tiêu",
                    budget.getId());
        }
        return budget;
    }

    public void deleteBudget(User user, Long budgetId) {
        budgetRepository.findById(budgetId).ifPresent(b -> {
            if (b.getUser().getId().equals(user.getId())) {
                budgetRepository.delete(b);
            }
        });
    }
}
