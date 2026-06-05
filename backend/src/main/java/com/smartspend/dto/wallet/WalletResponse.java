package com.smartspend.dto.wallet;

import com.smartspend.entity.Wallet.WalletType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder
public class WalletResponse {
    private Long id;
    private String name;
    private WalletType type;
    private BigDecimal balance;
    private String currency;
    private String color;
    private String icon;
    private LocalDateTime createdAt;
}
