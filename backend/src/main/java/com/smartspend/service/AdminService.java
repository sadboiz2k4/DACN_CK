package com.smartspend.service;

import com.smartspend.dto.admin.UserAdminResponse;
import com.smartspend.entity.User;
import com.smartspend.exception.ResourceNotFoundException;
import com.smartspend.repository.TransactionRepository;
import com.smartspend.repository.UserRepository;
import com.smartspend.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public Page<UserAdminResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toAdminResponse);
    }

    public Page<UserAdminResponse> searchUsers(String keyword, Pageable pageable) {
        return userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
                keyword, keyword, pageable).map(this::toAdminResponse);
    }

    public UserAdminResponse toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        user.setActive(!user.isActive());
        return toAdminResponse(userRepository.save(user));
    }

    public Map<String, Object> getSystemStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByIsActiveTrue();
        long totalTransactions = transactionRepository.count();
        long totalWallets = walletRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("activeUsers", activeUsers);
        stats.put("inactiveUsers", totalUsers - activeUsers);
        stats.put("totalTransactions", totalTransactions);
        stats.put("totalWallets", totalWallets);
        return stats;
    }

    private UserAdminResponse toAdminResponse(User user) {
        long walletCount = walletRepository.countByUserId(user.getId());
        long txCount = transactionRepository.countByUserId(user.getId());
        return UserAdminResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .walletCount(walletCount)
                .transactionCount(txCount)
                .build();
    }
}
