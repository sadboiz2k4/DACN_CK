package com.smartspend.service;

import com.smartspend.dto.recurring.*;
import com.smartspend.entity.*;
import com.smartspend.entity.RecurringPayment.*;
import com.smartspend.exception.ResourceNotFoundException;
import com.smartspend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringPaymentService {

    private final RecurringPaymentRepository recurringPaymentRepository;
    private final RecurringHistoryRepository recurringHistoryRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;

    // =========================================================================
    // 1. TẠO MỚI DỊCH VỤ / KHOẢN TRẢ GÓP (POST /api/recurring)
    // =========================================================================

    @Transactional
    public RecurringPaymentResponse create(User user, RecurringPaymentRequest request) {
        // Validate: INSTALLMENT bắt buộc có totalMonths
        if (request.getPaymentType() == PaymentType.INSTALLMENT
                && (request.getTotalMonths() == null || request.getTotalMonths() < 1)) {
            throw new IllegalArgumentException("Khoản trả góp bắt buộc phải có tổng số kỳ (totalMonths >= 1)");
        }
        // Không cho phép set totalMonths với RECURRING
        if (request.getPaymentType() == PaymentType.RECURRING && request.getTotalMonths() != null) {
            throw new IllegalArgumentException("Dịch vụ định kỳ (RECURRING) không cần số kỳ");
        }

        Wallet wallet = getWalletOfUser(request.getWalletId(), user.getId());
        Category category = getCategoryOfUser(request.getCategoryId(), user.getId());

        // next_payment_date ban đầu = start_date (thanh toán ngay vào ngày bắt đầu)
        LocalDate nextPaymentDate = request.getStartDate();

        RecurringPayment entity = RecurringPayment.builder()
                .user(user)
                .wallet(wallet)
                .category(category)
                .name(request.getName())
                .amount(request.getAmount())
                .paymentType(request.getPaymentType())
                .cycleType(request.getCycleType())
                .startDate(request.getStartDate())
                .nextPaymentDate(nextPaymentDate)
                .totalMonths(request.getTotalMonths())
                .paidMonths(0)
                .status(RecurringStatus.ACTIVE)
                .build();

        return toResponse(recurringPaymentRepository.save(entity));
    }

    // =========================================================================
    // 2. LẤY DANH SÁCH (GET /api/recurring)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<RecurringPaymentResponse> getList(User user, PaymentType paymentType,
                                                   RecurringStatus status, Pageable pageable) {
        return recurringPaymentRepository
                .findByUserIdWithFilters(user.getId(), paymentType, status, pageable)
                .map(this::toResponse);
    }

    // =========================================================================
    // 3. CẬP NHẬT (PUT /api/recurring/{id})
    // =========================================================================

    @Transactional
    public RecurringPaymentResponse update(User user, Long id, RecurringPaymentUpdateRequest request) {
        RecurringPayment entity = recurringPaymentRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ không tồn tại hoặc không thuộc về bạn"));

        // Không cho phép user set thủ công sang COMPLETED — chỉ Scheduler mới làm được
        if (request.getStatus() == RecurringStatus.COMPLETED) {
            throw new IllegalArgumentException("Không thể đặt trạng thái COMPLETED thủ công. Trạng thái này được hệ thống tự động cập nhật khi hoàn tất kỳ trả góp.");
        }
        // Không thể cập nhật dịch vụ đã COMPLETED
        if (entity.getStatus() == RecurringStatus.COMPLETED) {
            throw new IllegalArgumentException("Dịch vụ đã hoàn tất, không thể chỉnh sửa");
        }

        Wallet wallet   = getWalletOfUser(request.getWalletId(), user.getId());
        Category category = getCategoryOfUser(request.getCategoryId(), user.getId());

        entity.setAmount(request.getAmount());
        entity.setWallet(wallet);
        entity.setCategory(category);
        entity.setStatus(request.getStatus());

        return toResponse(recurringPaymentRepository.save(entity));
    }

    // =========================================================================
    // 4. XÓA (DELETE /api/recurring/{id})
    // =========================================================================

    @Transactional
    public void delete(User user, Long id) {
        RecurringPayment entity = recurringPaymentRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ không tồn tại hoặc không thuộc về bạn"));

        recurringPaymentRepository.delete(entity);
    }

    // =========================================================================
    // 5. LỊCH SỬ THANH TOÁN (GET /api/recurring/{id}/history)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<RecurringHistoryResponse> getHistory(User user, Long id, Pageable pageable) {
        // Xác minh ownership trước khi trả về lịch sử
        recurringPaymentRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ không tồn tại hoặc không thuộc về bạn"));

        return recurringHistoryRepository
                .findByRecurringPaymentId(id, pageable)
                .map(this::toHistoryResponse);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private Wallet getWalletOfUser(Long walletId, Long userId) {
        return walletRepository.findById(walletId)
                .filter(w -> w.getUser().getId().equals(userId) && w.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví: " + walletId));
    }

    private Category getCategoryOfUser(Long categoryId, Long userId) {
        return categoryRepository.findById(categoryId)
                .filter(c -> c.isDefault() || (c.getUser() != null && c.getUser().getId().equals(userId)))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục: " + categoryId));
    }

    /** Map RecurringPayment entity → DTO trả về client */
    public RecurringPaymentResponse toResponse(RecurringPayment r) {
        Integer remaining = null;
        Integer progress  = null;
        if (r.getPaymentType() == PaymentType.INSTALLMENT && r.getTotalMonths() != null) {
            remaining = r.getTotalMonths() - r.getPaidMonths();
            progress  = (int) Math.round((r.getPaidMonths() * 100.0) / r.getTotalMonths());
        }
        return RecurringPaymentResponse.builder()
                .id(r.getId())
                .name(r.getName())
                .amount(r.getAmount())
                .walletId(r.getWallet().getId())
                .walletName(r.getWallet().getName())
                .categoryId(r.getCategory().getId())
                .categoryName(r.getCategory().getName())
                .categoryIcon(r.getCategory().getIcon())
                .categoryColor(r.getCategory().getColor())
                .paymentType(r.getPaymentType())
                .cycleType(r.getCycleType())
                .startDate(r.getStartDate())
                .nextPaymentDate(r.getNextPaymentDate())
                .totalMonths(r.getTotalMonths())
                .paidMonths(r.getPaidMonths())
                .remainingMonths(remaining)
                .status(r.getStatus())
                .progressPercent(progress)
                .build();
    }

    /** Map RecurringHistory entity → DTO trả về client */
    private RecurringHistoryResponse toHistoryResponse(RecurringHistory h) {
        return RecurringHistoryResponse.builder()
                .id(h.getId())
                .recurringPaymentId(h.getRecurringPayment().getId())
                .recurringPaymentName(h.getRecurringPayment().getName())
                .transactionId(h.getTransaction() != null ? h.getTransaction().getId() : null)
                .paymentDate(h.getPaymentDate())
                .status(h.getStatus())
                .failureReason(h.getFailureReason())
                .build();
    }
}
