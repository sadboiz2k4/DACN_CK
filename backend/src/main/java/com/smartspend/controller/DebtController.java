package com.smartspend.controller;

import com.smartspend.dto.debt.*;
import com.smartspend.entity.Debt.DebtStatus;
import com.smartspend.entity.Debt.DebtType;
import com.smartspend.entity.User;
import com.smartspend.service.DebtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debtService;

    // =========================================================================
    // 0. TẠO MỚI KHOẢN NỢ / KHOẢN VAY (POST /api/debts)
    // =========================================================================

    /**
     * Tạo một khoản nợ/cho vay mới.
     * - DEBT: Nhận tiền vay vào ví → cộng balance.
     * - LOAN: Xuất tiền cho vay từ ví → trừ balance (kiểm tra đủ số dư).
     * Tạo kèm 1 Transaction ghi nhận dòng tiền ban đầu.
     */
    @PostMapping("/debts")
    public ResponseEntity<DebtResponse> createDebt(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DebtRequest request) {

        DebtResponse response = debtService.createDebt(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =========================================================================
    // 0b. SỬA THÔNG TIN KHOẢN NỢ (PUT /api/debts/{id})
    // =========================================================================

    /**
     * Chỉnh sửa thông tin khoản nợ: tên, số tiền gốc, ngày hẹn trả, ghi chú.
     * Không cho phép đổi type (DEBT/LOAN) và ví gốc.
     */
    @PutMapping("/debts/{id}")
    public ResponseEntity<DebtResponse> updateDebt(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody DebtUpdateRequest request) {

        return ResponseEntity.ok(debtService.updateDebt(user, id, request));
    }

    // =========================================================================
    // 1. LẤY DANH SÁCH SỔ NỢ (GET /api/debts)
    // =========================================================================

    /**
     * Lấy danh sách khoản nợ của user hiện tại, có phân trang.
     *
     * @param type   (tuỳ chọn) Lọc theo loại: DEBT (đi vay) hoặc LOAN (cho vay)
     * @param status (tuỳ chọn) Lọc theo trạng thái: PARTIAL, PAID, OVERDUE
     * @param page   Số trang (bắt đầu từ 0)
     * @param size   Số bản ghi mỗi trang (mặc định 20)
     */
    @GetMapping("/debts")
    public ResponseEntity<Page<DebtResponse>> getDebts(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) DebtType type,
            @RequestParam(required = false) DebtStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(debtService.getDebts(user, type, status, pageable));
    }

    // =========================================================================
    // 2. XEM CHI TIẾT 1 KHOẢN NỢ (GET /api/debts/{id})
    // =========================================================================

    /**
     * Lấy chi tiết một khoản nợ kèm toàn bộ timeline lịch sử trả/thu nợ.
     */
    @GetMapping("/debts/{id}")
    public ResponseEntity<DebtResponse> getDebtDetail(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        return ResponseEntity.ok(debtService.getDebtDetail(user, id));
    }

    // =========================================================================
    // 3. THÊM MỘT LƯỢT TRẢ NỢ / THU NỢ (POST /api/debts/{id}/payments)
    // =========================================================================

    /**
     * Thêm một đợt trả nợ / thu nợ mới cho khoản nợ chỉ định.
     * Tự động tạo Transaction, cập nhật số dư ví, và cập nhật remain_amount.
     */
    @PostMapping("/debts/{id}/payments")
    public ResponseEntity<DebtDetailResponse> addPayment(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody DebtPaymentRequest request) {

        DebtDetailResponse response = debtService.addPayment(user, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =========================================================================
    // 4. SỬA MỘT LƯỢT TRẢ NỢ (PUT /api/debt-details/{detailId})
    // =========================================================================

    /**
     * Cập nhật thông tin một đợt trả nợ đã tồn tại.
     * Hoàn tác ảnh hưởng cũ và áp dụng thay đổi mới lên ví và khoản nợ.
     */
    @PutMapping("/debt-details/{detailId}")
    public ResponseEntity<DebtDetailResponse> updatePayment(
            @AuthenticationPrincipal User user,
            @PathVariable Long detailId,
            @Valid @RequestBody DebtPaymentUpdateRequest request) {

        return ResponseEntity.ok(debtService.updatePayment(user, detailId, request));
    }

    // =========================================================================
    // 5. XÓA MỘT LƯỢT TRẢ NỢ (DELETE /api/debt-details/{detailId})
    // =========================================================================

    /**
     * Xóa một đợt trả nợ.
     * Hoàn tiền về ví, cộng ngược remain_amount, xóa debt_detail và transaction.
     */
    @DeleteMapping("/debt-details/{detailId}")
    public ResponseEntity<Void> deletePayment(
            @AuthenticationPrincipal User user,
            @PathVariable Long detailId) {

        debtService.deletePayment(user, detailId);
        return ResponseEntity.noContent().build();
    }
}
