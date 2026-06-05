package com.smartspend.service;

import com.smartspend.dto.wallet.WalletRequest;
import com.smartspend.dto.wallet.WalletResponse;
import com.smartspend.entity.User;
import com.smartspend.entity.Wallet;
import com.smartspend.exception.ResourceNotFoundException;
import com.smartspend.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;

    public List<WalletResponse> getWallets(User user) {
        return walletRepository.findByUserIdAndIsActiveTrue(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public WalletResponse createWallet(User user, WalletRequest request) {
        Wallet wallet = Wallet.builder()
                .user(user)
                .name(request.getName())
                .type(request.getType())
                .balance(request.getInitialBalance())
                .currency(request.getCurrency())
                .color(request.getColor())
                .icon(request.getIcon())
                .isActive(true)
                .build();
        return toResponse(walletRepository.save(wallet));
    }

    public WalletResponse updateWallet(User user, Long id, WalletRequest request) {
        Wallet wallet = getWalletByIdAndUser(id, user.getId());
        wallet.setName(request.getName());
        wallet.setColor(request.getColor());
        wallet.setIcon(request.getIcon());
        if (request.getInitialBalance() != null) {
            wallet.setBalance(request.getInitialBalance());
        }
        return toResponse(walletRepository.save(wallet));
    }

    public void deleteWallet(User user, Long id) {
        Wallet wallet = getWalletByIdAndUser(id, user.getId());
        wallet.setActive(false);
        walletRepository.save(wallet);
    }

    public BigDecimal getTotalBalance(User user) {
        return walletRepository.sumBalanceByUserId(user.getId());
    }

    public Wallet getWalletByIdAndUser(Long id, Long userId) {
        return walletRepository.findById(id)
                .filter(w -> w.getUser().getId().equals(userId) && w.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ví: " + id));
    }

    private WalletResponse toResponse(Wallet w) {
        return WalletResponse.builder()
                .id(w.getId())
                .name(w.getName())
                .type(w.getType())
                .balance(w.getBalance())
                .currency(w.getCurrency())
                .color(w.getColor())
                .icon(w.getIcon())
                .createdAt(w.getCreatedAt())
                .build();
    }
}
