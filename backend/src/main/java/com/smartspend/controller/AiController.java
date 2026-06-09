package com.smartspend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartspend.dto.ai.AiParseResponse;
import com.smartspend.dto.ai.TransactionAiResponse;
import com.smartspend.entity.User;
import com.smartspend.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
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

    @Value("${ai.service.url}")
    private String aiServiceUrl;

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
    @GetMapping("/forecast")
    public ResponseEntity<?> getForecast(@AuthenticationPrincipal User user) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = aiServiceUrl + "/ai/forecast/" + user.getId();
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "AI service chưa khởi động: " + e.getMessage()));
        }
    }

    @GetMapping("/anomalies")
    public ResponseEntity<?> getAnomalies(@AuthenticationPrincipal User user) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = aiServiceUrl + "/ai/anomalies/" + user.getId();
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "anomalies", java.util.List.of()));
        }
    }

    @PostMapping("/scan-receipt")
    public ResponseEntity<?> scanReceipt(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Không có file ảnh"));
        }
        com.smartspend.dto.ai.OcrReceiptResponse result = geminiService.scanReceipt(file);
        return ResponseEntity.ok(result);
    }
}