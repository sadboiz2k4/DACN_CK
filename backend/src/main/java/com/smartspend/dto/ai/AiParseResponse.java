package com.smartspend.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class AiParseResponse {
    private boolean success;
    private String message;
    private TransactionAiResponse transaction;
}