package com.smartspend.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OcrReceiptResponse {
    private boolean success;
    private String message;
    private String merchant;
    private TransactionAiResponse transaction;
    private List<ReceiptItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReceiptItem {
        private String name;
        private int quantity;
        private long price;
    }
}
