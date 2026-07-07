package com.smartspend.controller;

import com.smartspend.dto.imports.*;
import com.smartspend.entity.User;
import com.smartspend.service.BankImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/bank-imports")
@RequiredArgsConstructor
public class BankImportController {

    private final BankImportService bankImportService;

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BankImportPreviewResponse> uploadPreview(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bankImportService.uploadPreview(user, file));
    }

    @PostMapping("/{importId}/preview")
    public ResponseEntity<BankImportPreviewResponse> previewMapping(
            @AuthenticationPrincipal User user,
            @PathVariable Long importId,
            @RequestBody BankImportMappingRequest mapping) {
        return ResponseEntity.ok(bankImportService.previewMapping(user, importId, mapping));
    }

    @PostMapping("/{importId}/confirm")
    public ResponseEntity<BankImportPreviewResponse> confirmImport(
            @AuthenticationPrincipal User user,
            @PathVariable Long importId,
            @Valid @RequestBody BankImportConfirmRequest request) {
        return ResponseEntity.ok(bankImportService.confirmImport(user, importId, request));
    }

    @GetMapping
    public ResponseEntity<List<BankImportHistoryResponse>> getHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(bankImportService.getHistory(user));
    }

    @PostMapping("/{importId}/rollback")
    public ResponseEntity<BankImportHistoryResponse> rollback(
            @AuthenticationPrincipal User user,
            @PathVariable Long importId) {
        return ResponseEntity.ok(bankImportService.rollback(user, importId));
    }
}
