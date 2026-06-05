package com.smartspend.controller;

import com.smartspend.dto.wallet.WalletRequest;
import com.smartspend.dto.wallet.WalletResponse;
import com.smartspend.entity.User;
import com.smartspend.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<List<WalletResponse>> getWallets(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(walletService.getWallets(user));
    }

    @PostMapping
    public ResponseEntity<WalletResponse> createWallet(@AuthenticationPrincipal User user,
                                                        @Valid @RequestBody WalletRequest request) {
        return ResponseEntity.ok(walletService.createWallet(user, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WalletResponse> updateWallet(@AuthenticationPrincipal User user,
                                                        @PathVariable Long id,
                                                        @Valid @RequestBody WalletRequest request) {
        return ResponseEntity.ok(walletService.updateWallet(user, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWallet(@AuthenticationPrincipal User user, @PathVariable Long id) {
        walletService.deleteWallet(user, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/total-balance")
    public ResponseEntity<Map<String, Object>> getTotalBalance(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("totalBalance", walletService.getTotalBalance(user)));
    }
}
