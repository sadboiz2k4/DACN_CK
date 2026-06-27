package com.smartspend.service;

import com.smartspend.dto.debt.*;
import com.smartspend.entity.*;
import com.smartspend.entity.Debt.DebtStatus;
import com.smartspend.entity.Debt.DebtType;
import com.smartspend.entity.Transaction.TransactionSource;
import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.exception.ResourceNotFoundException;
import com.smartspend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DebtService {

    private final DebtRepository debtRepository;
    private final DebtDetailRepository debtDetailRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    // Tên danh mục hệ thống dùng cho giao dịch nợ
    private static final String CATEGORY_TRA_NO = "Trả nợ";
    private static final String CATEGORY_THU_NO = "Thu nợ";

    // =========================================================================
    // 0. TẠO MỚI KHOẢN NỢ / KHOẢN VAY (POST /api/debts)
    // =========================================================================

    /**
     * Tạo một khoản nợ mới trong sổ nợ.
     *
     * Logic nghiệp vụ:
     * - DEBT (mình đi vay): Nhận tiền vào ví → cộng balance ví.
     * - LOAN (mình cho vay): Xuất tiền từ ví ra → trừ balance ví (kiểm tra đủ số dư).
     * - remain_amount ban đầu = amount (chưa trả đồng nào).
     * - Tạo một Transaction ghi nhận dòng tiền ban đầu:
     *     DEBT → INCOME (nhận tiền vay về)
     *     LOAN → EXPENSE (xuất tiền cho vay đi)
     * - Không tạo debt_detail cho lần tạo ban đầu vì đây là gốc nợ, không phải đợt trả.
     */
    @Transactional
    public DebtResponse createDebt(User user, DebtRequest request) {
        // Lấy ví ban đầu của khoản nợ
        Wallet wallet = getWalletOfUser(request.getWalletId(), user.getId());

        TransactionType txType;
        String categoryName;

        if (request.getType() == DebtType.DEBT) {
            // Mình đi vay → nhận tiền về → INCOME → cộng balance
            txType = TransactionType.INCOME;
            categoryName = CATEGORY_THU_NO; // Danh mục "Thu nợ" gần nghĩa nhất cho khoản nhận tiền vay

            wallet.setBalance(wallet.getBalance().add(request.getAmount()));
        } else {
            // Mình cho vay → xuất tiền đi → EXPENSE → trừ balance (cần đủ số dư)
            txType = TransactionType.EXPENSE;
            categoryName = CATEGORY_TRA_NO; // Danh mục "Trả nợ" gần nghĩa nhất cho khoản xuất tiền cho vay

            if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
                throw new IllegalArgumentException(
                        String.format("Số dư ví '%s' không đủ để cho vay. Hiện có: %.0f, cần: %.0f",
                                wallet.getName(), wallet.getBalance(), request.getAmount()));
            }
            wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
        }

        walletRepository.save(wallet);

        // Tìm danh mục hệ thống tương ứng
        Category category = categoryRepository
                .findByNameAndUserId(categoryName, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Danh mục mặc định '" + categoryName + "' không tồn tại trong hệ thống"));

        // Tạo transaction ghi nhận dòng tiền gốc
        String txNote = (request.getType() == DebtType.DEBT ? "Vay tiền từ " : "Cho vay: ")
                + request.getLenderBorrowerName()
                + (request.getNote() != null && !request.getNote().isBlank() ? " | " + request.getNote() : "");

        Transaction transaction = Transaction.builder()
                .user(user)
                .wallet(wallet)
                .category(category)
                .amount(request.getAmount())
                .type(txType)
                .note(txNote)
                .transactionDate(LocalDate.now())
                .source(TransactionSource.MANUAL)
                .build();
        transactionRepository.save(transaction);

        // Tạo khoản nợ, remain_amount = amount (chưa trả gì)
        Debt debt = Debt.builder()
                .user(user)
                .wallet(wallet)
                .lenderBorrowerName(request.getLenderBorrowerName())
                .type(request.getType())
                .amount(request.getAmount())
                .remainAmount(request.getAmount())
                .note(request.getNote())
                .dueDate(request.getDueDate())
                .status(DebtStatus.PARTIAL)
                .build();

        debt = debtRepository.save(debt);
        return toResponse(debt);
    }

    // =========================================================================
    // 0b. SỬA THÔNG TIN KHOẢN NỢ (PUT /api/debts/{id})
    // =========================================================================

    /**
     * Chỉnh sửa thông tin meta của khoản nợ: tên, số tiền gốc, ngày hẹn, ghi chú.
     * Không cho phép đổi type và walletId vì ảnh hưởng đến transaction gốc.
     *
     * Khi đổi amount:
     *  - amount mới phải >= paidAmount (không thể khai báo gốc nhỏ hơn đã trả)
     *  - remainAmount mới = amount mới - paidAmount
     *  - Nếu remainAmount mới = 0 → PAID, còn lại → PARTIAL
     */
    @Transactional
    public DebtResponse updateDebt(User user, Long debtId, DebtUpdateRequest request) {
        Debt debt = debtRepository
                .findByIdAndUserId(debtId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Khoản nợ không tồn tại hoặc không thuộc về bạn"));

        // Tính số tiền đã trả/thu = amount cũ - remainAmount cũ
        BigDecimal paidAmount = debt.getAmount().subtract(debt.getRemainAmount());

        // Validate: amount mới không được nhỏ hơn số đã trả
        if (request.getAmount().compareTo(paidAmount) < 0) {
            throw new IllegalArgumentException(
                    String.format("Số tiền gốc mới (%.0f) không thể nhỏ hơn số tiền đã %s (%.0f)",
                            request.getAmount(),
                            debt.getType() == DebtType.DEBT ? "trả" : "thu",
                            paidAmount));
        }

        // Cập nhật các trường thông tin
        debt.setLenderBorrowerName(request.getLenderBorrowerName());
        debt.setAmount(request.getAmount());
        debt.setNote(request.getNote());
        debt.setDueDate(request.getDueDate());

        // Tính lại remainAmount dựa trên amount mới
        BigDecimal newRemain = request.getAmount().subtract(paidAmount);
        debt.setRemainAmount(newRemain);

        // Cập nhật lại status
        if (newRemain.compareTo(BigDecimal.ZERO) == 0) {
            debt.setStatus(DebtStatus.PAID);
        } else {
            debt.setStatus(DebtStatus.PARTIAL);
        }

        debt = debtRepository.save(debt);
        return toResponse(debt);
    }

    // =========================================================================
    // 1. LẤY DANH SÁCH SỔ NỢ (GET /api/debts)
    // =========================================================================

    /**
     * Lấy danh sách khoản nợ có phân trang và bộ lọc theo type / status.
     * EntityGraph "Debt.withWallet" đảm bảo chỉ 1 câu SQL được thực thi.
     */
    @Transactional(readOnly = true)
    public Page<DebtResponse> getDebts(User user, DebtType type, DebtStatus status, Pageable pageable) {
        return debtRepository
                .findByUserIdWithFilters(user.getId(), type, status, pageable)
                .map(this::toResponse);
    }

    // =========================================================================
    // 2. XEM CHI TIẾT 1 KHOẢN NỢ (GET /api/debts/{id})
    // =========================================================================

    /**
     * Lấy chi tiết khoản nợ kèm toàn bộ timeline trả nợ.
     * EntityGraph "Debt.withWalletAndDetails" đảm bảo chỉ 1 câu SQL.
     */
    @Transactional(readOnly = true)
    public DebtResponse getDebtDetail(User user, Long debtId) {
        Debt debt = debtRepository
                .findByIdAndUserIdWithDetails(debtId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Khoản nợ không tồn tại hoặc không thuộc về bạn"));

        return toResponseWithDetails(debt);
    }

    // =========================================================================
    // 3. THÊM MỘT LƯỢT TRẢ NỢ / THU NỢ (POST /api/debts/{id}/payments)
    // =========================================================================

    /**
     * Thêm một đợt trả nợ hoặc thu nợ mới cho khoản nợ chỉ định.
     * Tất cả thao tác DB được bọc trong 1 transaction duy nhất.
     */
    @Transactional
    public DebtDetailResponse addPayment(User user, Long debtId, DebtPaymentRequest request) {
        // a) Kiểm tra khoản nợ tồn tại và thuộc về user
        Debt debt = debtRepository
                .findByIdAndUserId(debtId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Khoản nợ không tồn tại hoặc không thuộc về bạn"));

        // a) Validate số tiền không vượt quá remain_amount
        if (request.getPayAmount().compareTo(debt.getRemainAmount()) > 0) {
            throw new IllegalArgumentException(
                    String.format("Số tiền trả (%.0f) vượt quá số tiền còn nợ (%.0f)",
                            request.getPayAmount(), debt.getRemainAmount()));
        }

        // Lấy ví thực hiện giao dịch lần này
        Wallet wallet = getWalletOfUser(request.getWalletId(), user.getId());

        // b) Xác định loại transaction và tên danh mục tương ứng
        TransactionType txType;
        String categoryName;

        if (debt.getType() == DebtType.DEBT) {
            // Mình đi vay → trả nợ = chi tiền ra → EXPENSE
            txType = TransactionType.EXPENSE;
            categoryName = CATEGORY_TRA_NO;

            // c) Kiểm tra số dư ví đủ để trả
            if (wallet.getBalance().compareTo(request.getPayAmount()) < 0) {
                throw new IllegalArgumentException(
                        String.format("Số dư ví '%s' không đủ. Hiện có: %.0f, cần: %.0f",
                                wallet.getName(), wallet.getBalance(), request.getPayAmount()));
            }
            // Trừ tiền ra khỏi ví
            wallet.setBalance(wallet.getBalance().subtract(request.getPayAmount()));
        } else {
            // Mình cho vay → thu nợ = nhận tiền về → INCOME
            txType = TransactionType.INCOME;
            categoryName = CATEGORY_THU_NO;
            // Cộng tiền vào ví
            wallet.setBalance(wallet.getBalance().add(request.getPayAmount()));
        }

        // c) Lưu lại số dư ví đã thay đổi
        walletRepository.save(wallet);

        // b) Tìm danh mục hệ thống tương ứng (Trả nợ / Thu nợ)
        Category category = categoryRepository
                .findByNameAndUserId(categoryName, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Danh mục mặc định '" + categoryName + "' không tồn tại trong hệ thống"));

        // b) Tạo transaction ghi nhận dòng tiền
        Transaction transaction = Transaction.builder()
                .user(user)
                .wallet(wallet)
                .category(category)
                .amount(request.getPayAmount())
                .type(txType)
                .note(buildTransactionNote(debt, request.getNote()))
                .transactionDate(LocalDate.now())
                .source(TransactionSource.MANUAL)
                .build();
        transaction = transactionRepository.save(transaction);

        // d) Trừ bớt remain_amount trong bảng debts
        BigDecimal newRemain = debt.getRemainAmount().subtract(request.getPayAmount());
        debt.setRemainAmount(newRemain);

        // d) Nếu remain_amount về 0, tự động chuyển status sang PAID
        if (newRemain.compareTo(BigDecimal.ZERO) == 0) {
            debt.setStatus(DebtStatus.PAID);
        }
        debtRepository.save(debt);

        // e) Lưu thông tin đợt trả vào bảng debt_details
        DebtDetail detail = DebtDetail.builder()
                .debt(debt)
                .wallet(wallet)
                .transaction(transaction)
                .payAmount(request.getPayAmount())
                .paymentDate(LocalDateTime.now())
                .note(request.getNote())
                .build();
        detail = debtDetailRepository.save(detail);

        return toDetailResponse(detail);
    }

    // =========================================================================
    // 4. SỬA MỘT LƯỢT TRẢ NỢ (PUT /api/debt-details/{detailId})
    // =========================================================================

    /**
     * Cập nhật một đợt trả nợ đã tồn tại.
     * Logic: Hoàn tác ví cũ → Áp dụng ví mới → Cập nhật remain_amount & status.
     */
    @Transactional
    public DebtDetailResponse updatePayment(User user, Long detailId, DebtPaymentUpdateRequest request) {
        // Lấy detail kèm debt + wallet + transaction để kiểm tra và hoàn tác
        DebtDetail detail = debtDetailRepository
                .findByIdWithDebtAndWalletAndTransaction(detailId)
                .orElseThrow(() -> new ResourceNotFoundException("Đợt trả nợ không tồn tại"));

        // Kiểm tra quyền sở hữu thông qua khoản nợ cha
        Debt debt = detail.getDebt();
        if (!debt.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Đợt trả nợ không tồn tại hoặc không thuộc về bạn");
        }

        BigDecimal oldPayAmount = detail.getPayAmount();
        Wallet oldWallet = detail.getWallet();
        Wallet newWallet = getWalletOfUser(request.getWalletId(), user.getId());

        // --- Hoàn tác ảnh hưởng của đợt trả cũ lên ví cũ ---
        if (debt.getType() == DebtType.DEBT) {
            // Trả nợ trước đây trừ tiền → hoàn lại = cộng tiền về
            oldWallet.setBalance(oldWallet.getBalance().add(oldPayAmount));
        } else {
            // Thu nợ trước đây cộng tiền → hoàn lại = trừ tiền ra
            if (oldWallet.getBalance().compareTo(oldPayAmount) < 0) {
                throw new IllegalArgumentException(
                        "Không thể hoàn tác: Số dư ví '" + oldWallet.getName() + "' không đủ để hoàn tác giao dịch cũ");
            }
            oldWallet.setBalance(oldWallet.getBalance().subtract(oldPayAmount));
        }
        walletRepository.save(oldWallet);

        // --- Validate số tiền mới không vượt quá (remain + oldPayAmount) ---
        // Sau khi hoàn tác, remain_amount "tăng" lại bằng oldPayAmount
        BigDecimal adjustedRemain = debt.getRemainAmount().add(oldPayAmount);
        if (request.getPayAmount().compareTo(adjustedRemain) > 0) {
            throw new IllegalArgumentException(
                    String.format("Số tiền mới (%.0f) vượt quá số tiền nợ còn lại có thể trả (%.0f)",
                            request.getPayAmount(), adjustedRemain));
        }

        // --- Áp dụng số tiền mới lên ví mới ---
        if (debt.getType() == DebtType.DEBT) {
            if (newWallet.getBalance().compareTo(request.getPayAmount()) < 0) {
                throw new IllegalArgumentException(
                        String.format("Số dư ví '%s' không đủ. Hiện có: %.0f, cần: %.0f",
                                newWallet.getName(), newWallet.getBalance(), request.getPayAmount()));
            }
            newWallet.setBalance(newWallet.getBalance().subtract(request.getPayAmount()));
        } else {
            newWallet.setBalance(newWallet.getBalance().add(request.getPayAmount()));
        }
        walletRepository.save(newWallet);

        // --- Cập nhật remain_amount khoản nợ cha ---
        BigDecimal newRemain = adjustedRemain.subtract(request.getPayAmount());
        debt.setRemainAmount(newRemain);
        debt.setStatus(newRemain.compareTo(BigDecimal.ZERO) == 0 ? DebtStatus.PAID : DebtStatus.PARTIAL);
        debtRepository.save(debt);

        // --- Cập nhật transaction đi kèm ---
        Transaction transaction = detail.getTransaction();
        transaction.setAmount(request.getPayAmount());
        transaction.setWallet(newWallet);
        transaction.setNote(buildTransactionNote(debt, request.getNote()));
        transactionRepository.save(transaction);

        // --- Cập nhật bản ghi detail ---
        detail.setWallet(newWallet);
        detail.setPayAmount(request.getPayAmount());
        detail.setNote(request.getNote());
        detail = debtDetailRepository.save(detail);

        return toDetailResponse(detail);
    }

    // =========================================================================
    // 5. XÓA MỘT LƯỢT TRẢ NỢ (DELETE /api/debt-details/{detailId})
    // =========================================================================

    /**
     * Xóa một đợt trả nợ:
     * - Hoàn tiền về ví
     * - Cộng ngược remain_amount về khoản nợ cha
     * - Nếu nợ cha đang PAID → chuyển lại PARTIAL
     * - Xóa DebtDetail và Transaction đi kèm
     */
    @Transactional
    public void deletePayment(User user, Long detailId) {
        DebtDetail detail = debtDetailRepository
                .findByIdWithDebtAndWalletAndTransaction(detailId)
                .orElseThrow(() -> new ResourceNotFoundException("Đợt trả nợ không tồn tại"));

        // Kiểm tra quyền sở hữu
        Debt debt = detail.getDebt();
        if (!debt.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Đợt trả nợ không tồn tại hoặc không thuộc về bạn");
        }

        Wallet wallet = detail.getWallet();
        BigDecimal payAmount = detail.getPayAmount();

        // Hoàn tiền về ví
        if (debt.getType() == DebtType.DEBT) {
            // Trả nợ = EXPENSE → hoàn lại = cộng tiền về ví
            wallet.setBalance(wallet.getBalance().add(payAmount));
        } else {
            // Thu nợ = INCOME → hoàn lại = trừ tiền khỏi ví
            if (wallet.getBalance().compareTo(payAmount) < 0) {
                throw new IllegalArgumentException(
                        "Không thể xóa: Số dư ví '" + wallet.getName() + "' không đủ để hoàn tác giao dịch");
            }
            wallet.setBalance(wallet.getBalance().subtract(payAmount));
        }
        walletRepository.save(wallet);

        // Cộng ngược remain_amount về khoản nợ cha
        debt.setRemainAmount(debt.getRemainAmount().add(payAmount));

        // Nếu nợ cha đang PAID → chuyển lại PARTIAL
        if (debt.getStatus() == DebtStatus.PAID) {
            debt.setStatus(DebtStatus.PARTIAL);
        }
        debtRepository.save(debt);

        // Lấy transaction trước khi xóa detail (do cascade)
        Transaction transaction = detail.getTransaction();

        // Xóa debt_detail trước (vì transaction_id là FK trong debt_details)
        debtDetailRepository.delete(detail);

        // Xóa transaction đi kèm
        transactionRepository.delete(transaction);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Tìm ví hợp lệ và thuộc về user.
     */
    private Wallet getWalletOfUser(Long walletId, Long userId) {
        return walletRepository.findById(walletId)
                .filter(w -> w.getUser().getId().equals(userId) && w.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví: " + walletId));
    }

    /**
     * Tạo note cho transaction từ thông tin khoản nợ + note của đợt trả.
     */
    private String buildTransactionNote(Debt debt, String paymentNote) {
        String base = (debt.getType() == DebtType.DEBT ? "Trả nợ" : "Thu nợ")
                + " - " + debt.getLenderBorrowerName();
        if (paymentNote != null && !paymentNote.isBlank()) {
            return base + " | " + paymentNote;
        }
        return base;
    }

    /**
     * Map Debt entity → DebtResponse (không có debtDetails — dùng cho danh sách).
     */
    private DebtResponse toResponse(Debt debt) {
        BigDecimal paidAmount = debt.getAmount().subtract(debt.getRemainAmount());
        boolean overdue = debt.getStatus() != DebtStatus.PAID
                && debt.getDueDate() != null
                && debt.getDueDate().isBefore(LocalDate.now());

        return DebtResponse.builder()
                .id(debt.getId())
                .walletId(debt.getWallet().getId())
                .walletName(debt.getWallet().getName())
                .lenderBorrowerName(debt.getLenderBorrowerName())
                .type(debt.getType())
                .amount(debt.getAmount())
                .remainAmount(debt.getRemainAmount())
                .paidAmount(paidAmount)
                .note(debt.getNote())
                .dueDate(debt.getDueDate())
                .status(debt.getStatus())
                .overdue(overdue)
                .createdAt(debt.getCreatedAt())
                .updatedAt(debt.getUpdatedAt())
                .build();
    }

    /**
     * Map Debt entity → DebtResponse kèm debtDetails — dùng cho API chi tiết.
     */
    private DebtResponse toResponseWithDetails(Debt debt) {
        DebtResponse response = toResponse(debt);

        List<DebtDetailResponse> detailResponses = debt.getDebtDetails()
                .stream()
                .map(this::toDetailResponse)
                .toList();

        response.setDebtDetails(detailResponses);
        return response;
    }

    /**
     * Map DebtDetail entity → DebtDetailResponse.
     */
    private DebtDetailResponse toDetailResponse(DebtDetail detail) {
        return DebtDetailResponse.builder()
                .id(detail.getId())
                .walletId(detail.getWallet().getId())
                .walletName(detail.getWallet().getName())
                .transactionId(detail.getTransaction().getId())
                .transactionType(detail.getTransaction().getType().name())
                .payAmount(detail.getPayAmount())
                .paymentDate(detail.getPaymentDate())
                .note(detail.getNote())
                .build();
    }
}
