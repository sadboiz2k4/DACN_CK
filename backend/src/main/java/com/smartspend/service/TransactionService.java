package com.smartspend.service;

import com.smartspend.dto.transaction.TransactionRequest;
import com.smartspend.dto.transaction.TransactionResponse;
import com.smartspend.entity.*;
import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.exception.ResourceNotFoundException;
import com.smartspend.repository.CategoryRepository;
import com.smartspend.repository.TransactionRepository;
import com.smartspend.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final WalletService walletService;

    @Transactional
    public TransactionResponse create(User user, TransactionRequest request) {
        if (request.getTransactionDate() == null) {
            request.setTransactionDate(LocalDate.now());
        }

        Wallet wallet = walletService.getWalletByIdAndUser(request.getWalletId(), user.getId());

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Danh mục không tồn tại"));
        } else if (request.getCategoryName() != null && !request.getCategoryName().isBlank()) {
            category = categoryRepository.findByNameAndUserId(request.getCategoryName(), user.getId())
                    .orElseGet(() -> categoryRepository.findByNameAndUserId("Khác", user.getId())
                            .orElseThrow(() -> new ResourceNotFoundException("Danh mục mặc định 'Khác' không tồn tại trong hệ thống")));
        }

        Transaction transaction = Transaction.builder()
                .user(user)
                .wallet(wallet)
                .category(category)
                .amount(request.getAmount())
                .type(request.getType())
                .note(request.getNote())
                .transactionDate(request.getTransactionDate())
                .source(request.getSource())
                .build();

        updateWalletBalance(wallet, request.getType(), request.getAmount());

        if (request.getType() == TransactionType.TRANSFER && request.getToWalletId() != null) {
            Wallet toWallet = walletService.getWalletByIdAndUser(request.getToWalletId(), user.getId());
            transaction.setToWallet(toWallet);
            toWallet.setBalance(toWallet.getBalance().add(request.getAmount()));
            walletRepository.save(toWallet);
        }

        walletRepository.save(wallet);
        return toResponse(transactionRepository.save(transaction));
    }

    public Page<TransactionResponse> getTransactions(User user, Pageable pageable) {
        return transactionRepository
                .findByUserIdOrderByTransactionDateDescCreatedAtDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    public java.util.List<TransactionResponse> getByCategory(User user, String categoryName, int month, int year) {
        java.time.YearMonth ym = java.time.YearMonth.of(year, month);
        return transactionRepository
                .findByUserIdAndCategoryNameAndDateRange(user.getId(), categoryName, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public TransactionResponse update(User user, Long id, TransactionRequest request) {
        Transaction tx = transactionRepository.findById(id)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Giao dịch không tồn tại"));

        Wallet oldWallet = tx.getWallet();
        // Hoàn tác ảnh hưởng ví cũ
        if (tx.getType() == TransactionType.INCOME)
            oldWallet.setBalance(oldWallet.getBalance().subtract(tx.getAmount()));
        else if (tx.getType() == TransactionType.EXPENSE)
            oldWallet.setBalance(oldWallet.getBalance().add(tx.getAmount()));

        Wallet newWallet = walletService.getWalletByIdAndUser(request.getWalletId(), user.getId());
        boolean sameWallet = oldWallet.getId().equals(newWallet.getId());
        Wallet targetWallet = sameWallet ? oldWallet : newWallet;

        // Áp dụng ảnh hưởng ví mới
        if (request.getType() == TransactionType.INCOME)
            targetWallet.setBalance(targetWallet.getBalance().add(request.getAmount()));
        else if (request.getType() == TransactionType.EXPENSE)
            targetWallet.setBalance(targetWallet.getBalance().subtract(request.getAmount()));

        walletRepository.save(oldWallet);
        if (!sameWallet) walletRepository.save(newWallet);

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId()).orElse(null);
        } else if (request.getCategoryName() != null && !request.getCategoryName().isBlank()) {
            category = categoryRepository.findByNameAndUserId(request.getCategoryName(), user.getId()).orElse(null);
        }

        tx.setAmount(request.getAmount());
        tx.setType(request.getType());
        tx.setWallet(newWallet);
        tx.setCategory(category);
        tx.setNote(request.getNote());
        if (request.getTransactionDate() != null) tx.setTransactionDate(request.getTransactionDate());

        return toResponse(transactionRepository.save(tx));
    }

    @Transactional
    public void delete(User user, Long id) {
        Transaction transaction = transactionRepository.findById(id)
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Giao dịch không tồn tại"));

        Wallet wallet = transaction.getWallet();
        if (transaction.getType() == TransactionType.INCOME) {
            wallet.setBalance(wallet.getBalance().subtract(transaction.getAmount()));
        } else if (transaction.getType() == TransactionType.EXPENSE) {
            wallet.setBalance(wallet.getBalance().add(transaction.getAmount()));
        }
        walletRepository.save(wallet);
        transactionRepository.delete(transaction);
    }

    private void updateWalletBalance(Wallet wallet, TransactionType type, BigDecimal amount) {
        if (type == TransactionType.INCOME) {
            wallet.setBalance(wallet.getBalance().add(amount));
        } else if (type == TransactionType.EXPENSE || type == TransactionType.TRANSFER) {
            wallet.setBalance(wallet.getBalance().subtract(amount));
        }
    }

    private TransactionResponse toResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .amount(t.getAmount())
                .type(t.getType())
                .walletId(t.getWallet().getId())
                .walletName(t.getWallet().getName())
                .categoryId(t.getCategory() != null ? t.getCategory().getId() : null)
                .categoryName(t.getCategory() != null ? t.getCategory().getName() : null)
                .categoryIcon(t.getCategory() != null ? t.getCategory().getIcon() : null)
                .categoryColor(t.getCategory() != null ? t.getCategory().getColor() : null)
                .note(t.getNote())
                .transactionDate(t.getTransactionDate())
                .source(t.getSource())
                .toWalletName(t.getToWallet() != null ? t.getToWallet().getName() : null)
                .createdAt(t.getCreatedAt())
                .build();
    }
}
