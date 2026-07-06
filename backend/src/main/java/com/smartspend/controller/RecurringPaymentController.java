package com.smartspend.controller;

import com.smartspend.dto.recurring.*;
import com.smartspend.entity.RecurringPayment.PaymentType;
import com.smartspend.entity.RecurringPayment.RecurringStatus;
import com.smartspend.entity.User;
import com.smartspend.service.RecurringPaymentService;
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
@RequestMapping("/api/recurring")
@RequiredArgsConstructor
public class RecurringPaymentController {

    private final RecurringPaymentService recurringPaymentService;

    // ─── POST /api/recurring ──────────────────────────────────────────────────
    /**
     * Tạo mới một dịch vụ định kỳ hoặc khoản trả góp.
     * INSTALLMENT bắt buộc phải có totalMonths, RECURRING thì không được có totalMonths.
     */
    @PostMapping
    public ResponseEntity<RecurringPaymentResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RecurringPaymentRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(recurringPaymentService.create(user, request));
    }

    // ─── GET /api/recurring ───────────────────────────────────────────────────
    /**
     * Lấy danh sách dịch vụ của user đang đăng nhập.
     *
     * @param paymentType (tuỳ chọn) Lọc theo RECURRING hoặc INSTALLMENT
     * @param status      (tuỳ chọn) Lọc theo ACTIVE, PAUSED, COMPLETED
     * @param page        Trang bắt đầu từ 0 (mặc định 0)
     * @param size        Số bản ghi mỗi trang (mặc định 20)
     */
    @GetMapping
    public ResponseEntity<Page<RecurringPaymentResponse>> getList(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) PaymentType paymentType,
            @RequestParam(required = false) RecurringStatus status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("nextPaymentDate").ascending());
        return ResponseEntity.ok(recurringPaymentService.getList(user, paymentType, status, pageable));
    }

    // ─── PUT /api/recurring/{id} ──────────────────────────────────────────────
    /**
     * Cập nhật số tiền, ví, danh mục, hoặc trạng thái (ACTIVE/PAUSED) của dịch vụ.
     * Không cho phép set trạng thái COMPLETED thủ công.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RecurringPaymentResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody RecurringPaymentUpdateRequest request) {

        return ResponseEntity.ok(recurringPaymentService.update(user, id, request));
    }

    // ─── DELETE /api/recurring/{id} ───────────────────────────────────────────
    /**
     * Xóa dịch vụ khỏi hệ thống (cùng toàn bộ lịch sử nhờ cascade).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        recurringPaymentService.delete(user, id);
        return ResponseEntity.noContent().build();
    }

    // ─── GET /api/recurring/{id}/history ─────────────────────────────────────
    /**
     * Lấy lịch sử thanh toán tự động của một dịch vụ cụ thể.
     * Bao gồm cả SUCCESS lẫn FAILED.
     */
    @GetMapping("/{id}/history")
    public ResponseEntity<Page<RecurringHistoryResponse>> getHistory(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("paymentDate").descending());
        return ResponseEntity.ok(recurringPaymentService.getHistory(user, id, pageable));
    }
}
