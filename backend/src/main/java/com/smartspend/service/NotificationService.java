package com.smartspend.service;

import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.entity.User;
import com.smartspend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final TransactionRepository transactionRepository;

    public List<Map<String, Object>> getNotifications(User user) {
        List<Map<String, Object>> notifications = new ArrayList<>();

        checkBudgetWarning(user, notifications);
        checkSpendingSpike(user, notifications);
        checkLowBalance(user, notifications);

        return notifications;
    }

    private void checkBudgetWarning(User user, List<Map<String, Object>> notifications) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate start = currentMonth.atDay(1);
        LocalDate end = LocalDate.now();

        BigDecimal currentExpense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.EXPENSE, start, end);

        // So sánh với tháng trước
        YearMonth lastMonth = currentMonth.minusMonths(1);
        BigDecimal lastMonthExpense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.EXPENSE,
                lastMonth.atDay(1), lastMonth.atEndOfMonth());

        if (lastMonthExpense != null && lastMonthExpense.compareTo(BigDecimal.ZERO) > 0) {
            double ratio = currentExpense.doubleValue() / lastMonthExpense.doubleValue();
            double dayRatio = (double) end.getDayOfMonth() / currentMonth.lengthOfMonth();

            if (ratio > dayRatio * 1.3) {
                notifications.add(Map.of(
                        "id", "budget-" + currentMonth,
                        "type", "WARNING",
                        "title", "Cảnh báo ngân sách",
                        "message", String.format("Chi tiêu tháng %s đang cao hơn 30%% so với tháng trước cùng kỳ",
                                currentMonth.format(DateTimeFormatter.ofPattern("MM/yyyy"))),
                        "icon", "alert-triangle",
                        "createdAt", LocalDate.now().toString()
                ));
            }
        }
    }

    private void checkSpendingSpike(User user, List<Map<String, Object>> notifications) {
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(7);

        BigDecimal todayExpense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.EXPENSE, today, today);

        BigDecimal weekExpense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.EXPENSE, sevenDaysAgo, today.minusDays(1));

        if (weekExpense != null && weekExpense.compareTo(BigDecimal.ZERO) > 0) {
            double dailyAvg = weekExpense.doubleValue() / 6;
            if (todayExpense.doubleValue() > dailyAvg * 2.5) {
                notifications.add(Map.of(
                        "id", "spike-" + today,
                        "type", "INFO",
                        "title", "Chi tiêu bất thường",
                        "message", "Chi tiêu hôm nay cao hơn 2.5 lần mức trung bình 7 ngày qua",
                        "icon", "trending-up",
                        "createdAt", today.toString()
                ));
            }
        }
    }

    private void checkLowBalance(User user, List<Map<String, Object>> notifications) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate start = currentMonth.atDay(1);
        LocalDate end = currentMonth.atEndOfMonth();

        BigDecimal income = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.INCOME, start, LocalDate.now());
        BigDecimal expense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.EXPENSE, start, LocalDate.now());

        if (income != null && income.compareTo(BigDecimal.ZERO) > 0) {
            double savingsRate = 1 - (expense.doubleValue() / income.doubleValue());
            if (savingsRate < 0.1) {
                notifications.add(Map.of(
                        "id", "savings-" + currentMonth,
                        "type", "WARNING",
                        "title", "Tiết kiệm thấp",
                        "message", String.format("Tỷ lệ tiết kiệm tháng này chỉ đạt %.0f%%. Hãy cân nhắc cắt giảm chi tiêu!",
                                Math.max(0, savingsRate * 100)),
                        "icon", "piggy-bank",
                        "createdAt", LocalDate.now().toString()
                ));
            }
        }
    }
}
