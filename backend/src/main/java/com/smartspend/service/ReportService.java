package com.smartspend.service;

import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.entity.User;
import com.smartspend.repository.TransactionRepository;
import com.smartspend.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;

    public Map<String, Object> getSummary(User user, String period) {
        LocalDate[] range = getDateRange(period);
        LocalDate start = range[0], end = range[1];

        BigDecimal totalIncome = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.INCOME, start, end);
        BigDecimal totalExpense = transactionRepository.sumByUserIdAndTypeAndDateRange(
                user.getId(), TransactionType.EXPENSE, start, end);
        BigDecimal totalBalance = walletRepository.sumBalanceByUserId(user.getId());

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalIncome", totalIncome);
        summary.put("totalExpense", totalExpense);
        summary.put("netBalance", totalIncome.subtract(totalExpense));
        summary.put("totalWalletBalance", totalBalance);
        summary.put("period", period);
        summary.put("startDate", start);
        summary.put("endDate", end);
        return summary;
    }

    public List<Map<String, Object>> getCategoryBreakdown(User user, String period) {
        LocalDate[] range = getDateRange(period);
        List<Object[]> results = transactionRepository.sumExpenseByCategory(
                user.getId(), range[0], range[1]);

        return results.stream().map(row -> {
            Map<String, Object> item = new HashMap<>();
            item.put("category", row[0]);
            item.put("total", row[1]);
            return item;
        }).toList();
    }

    public List<Map<String, Object>> getTimeline(User user, String period) {
        LocalDate[] range = getDateRange(period);
        var transactions = transactionRepository.findByUserIdAndTransactionDateBetween(
                user.getId(), range[0], range[1]);

        Map<LocalDate, BigDecimal[]> dailyMap = new HashMap<>();
        transactions.forEach(t -> {
            dailyMap.putIfAbsent(t.getTransactionDate(), new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            BigDecimal[] vals = dailyMap.get(t.getTransactionDate());
            if (t.getType() == TransactionType.INCOME) vals[0] = vals[0].add(t.getAmount());
            else if (t.getType() == TransactionType.EXPENSE) vals[1] = vals[1].add(t.getAmount());
        });

        return dailyMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    Map<String, Object> point = new HashMap<>();
                    point.put("date", e.getKey());
                    point.put("income", e.getValue()[0]);
                    point.put("expense", e.getValue()[1]);
                    return point;
                }).toList();
    }

    public List<Map<String, Object>> getMonthlyTrend(User user) {
        List<Object[]> expenseRows = transactionRepository.sumMonthlyByUserIdAndType(user.getId(), TransactionType.EXPENSE);
        List<Object[]> incomeRows  = transactionRepository.sumMonthlyByUserIdAndType(user.getId(), TransactionType.INCOME);

        Map<String, Map<String, Object>> merged = new java.util.LinkedHashMap<>();

        expenseRows.forEach(row -> {
            String key = row[0] + "-" + String.format("%02d", row[1]);
            merged.computeIfAbsent(key, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("month", key);
                m.put("expense", BigDecimal.ZERO);
                m.put("income", BigDecimal.ZERO);
                return m;
            }).put("expense", row[2]);
        });

        incomeRows.forEach(row -> {
            String key = row[0] + "-" + String.format("%02d", row[1]);
            merged.computeIfAbsent(key, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("month", key);
                m.put("expense", BigDecimal.ZERO);
                m.put("income", BigDecimal.ZERO);
                return m;
            }).put("income", row[2]);
        });

        return new java.util.ArrayList<>(merged.values());
    }

    private LocalDate[] getDateRange(String period) {
        LocalDate now = LocalDate.now();
        return switch (period) {
            case "week" -> new LocalDate[]{now.minusDays(6), now};
            case "year" -> new LocalDate[]{now.withDayOfYear(1), now};
            default -> { // month
                YearMonth ym = YearMonth.of(now.getYear(), now.getMonth());
                yield new LocalDate[]{ym.atDay(1), ym.atEndOfMonth()};
            }
        };
    }
}
