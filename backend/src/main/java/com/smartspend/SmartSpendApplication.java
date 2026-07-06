package com.smartspend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // Kích hoạt tính năng chạy tác vụ định kỳ cho toàn ứng dụng
public class SmartSpendApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartSpendApplication.class, args);
    }
}
