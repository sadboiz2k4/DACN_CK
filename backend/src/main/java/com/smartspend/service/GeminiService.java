package com.smartspend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${ai.gemini.key}")
    private String apiKey;

    public com.smartspend.dto.ai.TransactionAiResponse parseNaturalLanguage(String text) {
        try {
            String cleanApiKey = apiKey.trim().replace("\"", "").replace("'", "").replaceAll("\\s+", "");

            String urlString = "https://api.groq.com/openai/v1/chat/completions";

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            LocalDate today = LocalDate.now();
            String currentDateStr = today.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            String prompt = "Phân tích câu sau thành dữ liệu giao dịch tài chính JSON: \"" + text + "\".\n" +
                    "MỐC THỜI GIAN THỰC TẾ: Hôm nay là ngày " + currentDateStr + ". Nếu người dùng nói 'hôm nay', 'nay', hoặc không đề cập ngày, hãy dùng chính xác ngày này (" + currentDateStr + "). Nếu người dùng nói 'hôm qua', hãy tự trừ đi 1 ngày.\n\n" +
                    "BẮT BUỘC sử dụng chính xác các tên trường tiếng Anh sau đây, KHÔNG ĐƯỢC tự ý đổi tên trường:\n" +
                    "- amount: Số tiền (kiểu số, ví dụ: 300000)\n" +
                    "- type: Loại giao dịch ('EXPENSE' hoặc 'INCOME')\n" +
                    "- categoryName: Tên danh mục (Chỉ dùng các cụm từ chuẩn: 'Mua sắm', 'Ăn uống', 'Di chuyển', 'Giải trí', 'Thu nhập')\n" +
                    "- note: Ghi chú chi tiết (ví dụ: 'Mua áo')\n" +
                    "- date: Ngày định dạng YYYY-MM-DD\n\n" +
                    "QUY TẮC ĐẦU RA:\n" +
                    "- Nếu chỉ có 1 giao dịch, trả về ĐỐI TƯỢNG JSON đơn lẻ dạng: {\"amount\":..., \"type\":\"...\", \"categoryName\":\"...\", \"note\":\"...\", \"date\":\"...\"}\n" +
                    "- Nếu có nhiều giao dịch, trả về MẢNG JSON trực tiếp dạng: [{\"amount\":...}, {\"amount\":...}]\n" +
                    "- TUYỆT ĐỐI KHÔNG bọc mảng hoặc đối tượng vào bất kỳ thuộc tính nào khác như 'giao_dich' hay 'transactions'.";

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, String> responseFormat = new HashMap<>();
            responseFormat.put("type", "json_object");

            Map<String, Object> requestBodyMap = new HashMap<>();
            requestBodyMap.put("model", "llama-3.1-8b-instant");
            requestBodyMap.put("messages", List.of(message));
            requestBodyMap.put("response_format", responseFormat);

            String requestBody = mapper.writeValueAsString(requestBodyMap);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(urlString))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + cleanApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                Map<String, Object> responseMap = mapper.readValue(response.body(), Map.class);
                List<Map> choices = (List<Map>) responseMap.get("choices");
                Map choice0 = choices.get(0);
                Map messageObj = (Map) choice0.get("message");
                String jsonText = (String) messageObj.get("content");

                jsonText = jsonText.trim();

                if (jsonText.startsWith("[")) {
                    List<com.smartspend.dto.ai.TransactionAiResponse> list = mapper.readValue(
                            jsonText,
                            new com.fasterxml.jackson.core.type.TypeReference<List<com.smartspend.dto.ai.TransactionAiResponse>>() {}
                    );
                    return (list != null && !list.isEmpty()) ? list.get(0) : null;
                } else {
                    return mapper.readValue(jsonText, com.smartspend.dto.ai.TransactionAiResponse.class);
                }
            } else {
                System.err.println("Groq API báo lỗi HTTP Code: " + response.statusCode());
                System.err.println("Chi tiết lỗi từ Groq: " + response.body());
            }

        } catch (Exception e) {
            System.err.println("Lỗi hệ thống khi gọi Groq API: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
    public String transcribeAudio(MultipartFile audioFile) {
        try {
            String cleanApiKey = apiKey.trim().replace("\"", "").replace("'", "").replaceAll("\\s+", "");
            String url = "https://api.groq.com/openai/v1/audio/transcriptions";

            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("Authorization", "Bearer " + cleanApiKey);

            ByteArrayResource fileResource = new ByteArrayResource(audioFile.getBytes()) {
                @Override
                public String getFilename() {
                    return audioFile.getOriginalFilename() != null ? audioFile.getOriginalFilename() : "voice.wav";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", fileResource);
            body.add("model", "whisper-large-v3");
            body.add("language", "vi");

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (String) response.getBody().get("text");
            }

        } catch (Exception e) {
            System.err.println("Lỗi khi gửi file âm thanh lên Groq Whisper: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
}