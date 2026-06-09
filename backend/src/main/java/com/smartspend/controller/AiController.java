package com.smartspend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartspend.dto.ai.AiParseResponse;
import com.smartspend.dto.ai.TransactionAiResponse;
import com.smartspend.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private ObjectMapper objectMapper;

    @PostMapping("/parse-transaction")
    public ResponseEntity<AiParseResponse> parseTransaction(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new AiParseResponse(false, "Văn bản trống", null));
        }

        TransactionAiResponse txResponse = geminiService.parseNaturalLanguage(text);

        if (txResponse != null && txResponse.getAmount() != null) {
            return ResponseEntity.ok(new AiParseResponse(true, "Thành công", txResponse));
        }

        return ResponseEntity.ok(new AiParseResponse(false, "Không thể nhận diện được cấu trúc giao dịch", null));
    }
    @PostMapping("/parse-voice")
    public ResponseEntity<AiParseResponse> parseVoiceTransaction(@RequestParam("file") MultipartFile file) {
        String transcribedText = geminiService.transcribeAudio(file);

        if (transcribedText == null || transcribedText.isBlank()) {
            return ResponseEntity.badRequest().body(new AiParseResponse(false, "Không thể nghe hoặc dịch được giọng nói của bạn.", null));
        }

        System.out.println("Văn bản AI nghe được từ Whisper: " + transcribedText);

        com.smartspend.dto.ai.TransactionAiResponse result = geminiService.parseNaturalLanguage(transcribedText);

        if (result != null && result.getAmount() != null) {
            return ResponseEntity.ok(new AiParseResponse(true, transcribedText, result));
        }

        return ResponseEntity.ok(new AiParseResponse(false, "Không thể nhận diện được cấu trúc giao dịch từ giọng nói", null));
    }
    @PostMapping("/scan-receipt")
    public ResponseEntity<?> scanReceipt() {
        return ResponseEntity.ok(Map.of("success", true, "message", "Endpoint scan-receipt đã sẵn sàng"));
    }
}