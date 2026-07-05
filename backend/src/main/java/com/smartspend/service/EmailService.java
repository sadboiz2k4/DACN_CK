package com.smartspend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public void sendPasswordResetEmail(String to, String token, String fullName) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("Mail chưa được cấu hình (spring.mail.username). Bỏ qua gửi email tới {}", to);
            return;
        }

        String resetLink = frontendUrl + "/reset-password?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("SmartSpend - Đặt lại mật khẩu");
        message.setText(
                "Xin chào " + fullName + ",\n\n"
                + "Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản SmartSpend.\n"
                + "Nhấn vào link bên dưới để đặt mật khẩu mới (link có hiệu lực 1 giờ):\n\n"
                + resetLink + "\n\n"
                + "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.\n\n"
                + "Trân trọng,\nSmartSpend"
        );

        mailSender.send(message);
        log.info("Đã gửi email đặt lại mật khẩu tới {}", to);
    }
}
