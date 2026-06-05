package com.smartspend.dto.wallet;

import com.smartspend.entity.Wallet.WalletType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class WalletRequest {
    @NotBlank
    private String name;

    @NotNull
    private WalletType type;

    private BigDecimal initialBalance = BigDecimal.ZERO;
    private String currency = "VND";
    private String color = "#4F46E5";
    private String icon = "wallet";
}
