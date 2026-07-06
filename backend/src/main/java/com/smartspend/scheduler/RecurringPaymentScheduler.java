package com.smartspend.scheduler;

import com.smartspend.entity.*;
import com.smartspend.entity.RecurringHistory.HistoryStatus;
import com.smartspend.entity.RecurringPayment.CycleType;
import com.smartspend.entity.RecurringPayment.PaymentType;
import com.smartspend.entity.RecurringPayment.RecurringStatus;
import com.smartspend.entity.Transaction.TransactionSource;
import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Scheduler chạy tự động vào 1:00 sáng mỗi ngày để quét và xử lý
 * tất cả các dịch vụ định kỳ / trả góp đến hạn thanh toán.
 *
 * Mỗi dịch vụ được xử lý trong transaction độc lập để đảm bảo:
 * - Lỗi của một dịch vụ không ảnh hưởng đến các dịch vụ khác.
 * - Dữ liệu nhất quán (wallet balance, history, transaction).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RecurringPaymentScheduler {

    private final RecurringPaymentRepository recurringPaymentRepository;
    private final RecurringHistoryRepository  recurringHistoryRepository;
    private final WalletRepository            walletRepository;
    private final TransactionRepository       transactionRepository;
    private final CategoryRepository          categoryRepository;

    /**
     * Cron: "0 0 1 * * ?" = Chạy lúc 01:00:00 AM mỗi ngày.
     * Lấy danh sách dịch vụ ACTIVE có nextPaymentDate <= hôm nay,
     * sau đó gọi processOne() cho từng dịch vụ trong transaction riêng.
     */
//    @Scheduled(cron = "0 0 1 * * ?")
    @Scheduled(cron = "0 */1 * * * ?")
    public void runDailyProcessing() {
        LocalDate today = LocalDate.now();
        log.info("[Scheduler] Bắt đầu quét dịch vụ định kỳ đến hạn ngày {}", today);

        // Lấy danh sách từ DB — JOIN FETCH đã được cấu hình trong Repository
        List<RecurringPayment> dueList = recurringPaymentRepository.findAllDueForProcessing(today);
        log.info("[Scheduler] Tìm thấy {} dịch vụ cần xử lý", dueList.size());

        int successCount = 0;
        int failedCount  = 0;

        for (RecurringPayment rp : dueList) {
            try {
                // Xử lý từng dịch vụ trong transaction riêng biệt
                boolean ok = processOne(rp.getId());
                if (ok) successCount++; else failedCount++;
            } catch (Exception ex) {
                // Log lỗi hệ thống (không phải lỗi nghiệp vụ) nhưng tiếp tục xử lý các dịch vụ còn lại
                log.error("[Scheduler] Lỗi không xác định khi xử lý dịch vụ id={}: {}", rp.getId(), ex.getMessage(), ex);
                failedCount++;
            }
        }

        log.info("[Scheduler] Hoàn thành. Thành công: {}, Thất bại: {}", successCount, failedCount);
    }

    /**
     * Xử lý một dịch vụ định kỳ.
     * Mỗi lần gọi là một @Transactional riêng biệt:
     * nếu phương thức này throw exception, chỉ transaction của dịch vụ đó bị rollback.
     *
     * @return true nếu thanh toán thành công, false nếu thất bại nghiệp vụ (ví không đủ tiền)
     */
    @Transactional
    public boolean processOne(Long recurringId) {
        // Reload trong transaction mới để tránh stale data từ batch load trước
//        RecurringPayment rp = recurringPaymentRepository.findById(recurringId).orElse(null);
        RecurringPayment rp = recurringPaymentRepository.findByIdWithDetails(recurringId).orElse(null);
        // Guard: có thể bị xóa hoặc PAUSED trong khoảng thời gian giữa batch load và xử lý
        if (rp == null || rp.getStatus() != RecurringStatus.ACTIVE) {
            log.warn("[Scheduler] Bỏ qua dịch vụ id={}: không tồn tại hoặc không còn ACTIVE", recurringId);
            return false;
        }

        Wallet   wallet   = rp.getWallet();
        Category category = rp.getCategory();
        User     user     = rp.getUser();

        log.debug("[Scheduler] Xử lý: id={}, name='{}', wallet='{}', balance={}, amount={}",
                rp.getId(), rp.getName(), wallet.getName(), wallet.getBalance(), rp.getAmount());

        // ── CASE THẤT BẠI: Ví không đủ tiền ──────────────────────────────────
        if (wallet.getBalance().compareTo(rp.getAmount()) < 0) {
            String reason = String.format(
                    "Ví không đủ số dư. Hiện có: %.0f VND, cần: %.0f VND",
                    wallet.getBalance(), rp.getAmount());
            log.warn("[Scheduler] Thất bại — dịch vụ id={}: {}", rp.getId(), reason);

            RecurringHistory failedHistory = RecurringHistory.builder()
                    .recurringPayment(rp)
                    .transaction(null)       // không có transaction vì không trừ tiền
                    .status(HistoryStatus.FAILED)
                    .failureReason(reason)
                    .build();
            recurringHistoryRepository.save(failedHistory);
            return false;
        }

        // ── CASE THÀNH CÔNG ───────────────────────────────────────────────────

        // a) Trừ tiền khỏi ví
        wallet.setBalance(wallet.getBalance().subtract(rp.getAmount()));
        walletRepository.save(wallet);

        // b) Tạo Transaction EXPENSE ghi nhận khoản chi tự động
        Transaction transaction = Transaction.builder()
                .user(user)
                .wallet(wallet)
                .category(category)
                .amount(rp.getAmount())
                .type(TransactionType.EXPENSE)
                .note(buildTransactionNote(rp))
                .transactionDate(LocalDate.now())
                .source(TransactionSource.MANUAL)
                .build();
        transaction = transactionRepository.save(transaction);

        // c) Lưu lịch sử SUCCESS
        RecurringHistory history = RecurringHistory.builder()
                .recurringPayment(rp)
                .transaction(transaction)
                .status(HistoryStatus.SUCCESS)
                .build();
        recurringHistoryRepository.save(history);

        // d) Tính nextPaymentDate mới
        LocalDate newNextDate = calculateNextPaymentDate(rp.getNextPaymentDate(), rp.getCycleType());
        rp.setNextPaymentDate(newNextDate);

        // e) Nếu là INSTALLMENT: cộng paid_months, kiểm tra hoàn thành
        if (rp.getPaymentType() == PaymentType.INSTALLMENT) {
            int newPaidMonths = rp.getPaidMonths() + 1;
            rp.setPaidMonths(newPaidMonths);

            if (newPaidMonths >= rp.getTotalMonths()) {
                rp.setStatus(RecurringStatus.COMPLETED);
                log.info("[Scheduler] Dịch vụ id={} '{}' đã hoàn tất {} kỳ trả góp",
                        rp.getId(), rp.getName(), rp.getTotalMonths());
            }
        }

        recurringPaymentRepository.save(rp);
        log.debug("[Scheduler] Thành công — dịch vụ id={}, nextPaymentDate={}", rp.getId(), newNextDate);
        return true;
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Tính ngày thanh toán kỳ tiếp theo dựa trên chu kỳ.
     * MONTHLY → +1 tháng | YEARLY → +1 năm
     */
    private LocalDate calculateNextPaymentDate(LocalDate current, CycleType cycleType) {
        return switch (cycleType) {
            case MONTHLY -> current.plusMonths(1);
            case YEARLY  -> current.plusYears(1);
        };
    }

    /** Tạo note tự động cho Transaction được tạo bởi Scheduler */
    private String buildTransactionNote(RecurringPayment rp) {
        String typeLabel = rp.getPaymentType() == PaymentType.INSTALLMENT
                ? String.format("Trả góp kỳ %d/%d", rp.getPaidMonths() + 1, rp.getTotalMonths())
                : "Thanh toán định kỳ";
        return String.format("[Auto] %s - %s", typeLabel, rp.getName());
    }
}
