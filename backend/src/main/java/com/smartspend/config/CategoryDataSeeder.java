package com.smartspend.config;

import com.smartspend.entity.Category;
import com.smartspend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class CategoryDataSeeder {

    private final CategoryRepository categoryRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedDefaultCategories() {
        List<Category> defaults = List.of(
                createDefault("Ăn uống", Category.CategoryType.EXPENSE, "utensils", "#EF4444"),
                createDefault("Di chuyển", Category.CategoryType.EXPENSE, "car", "#F97316"),
                createDefault("Mua sắm", Category.CategoryType.EXPENSE, "shopping-bag", "#8B5CF6"),
                createDefault("Giải trí", Category.CategoryType.EXPENSE, "gamepad", "#EC4899"),
                createDefault("Sức khỏe", Category.CategoryType.EXPENSE, "heart", "#10B981"),
                createDefault("Hóa đơn & Tiện ích", Category.CategoryType.EXPENSE, "zap", "#F59E0B"),
                createDefault("Giáo dục", Category.CategoryType.EXPENSE, "book", "#3B82F6"),
                createDefault("Khác", Category.CategoryType.EXPENSE, "more-horizontal", "#6B7280"),
                createDefault("Lương", Category.CategoryType.INCOME, "briefcase", "#10B981"),
                createDefault("Đầu tư", Category.CategoryType.INCOME, "trending-up", "#3B82F6"),
                createDefault("Thưởng", Category.CategoryType.INCOME, "gift", "#F59E0B"),
                createDefault("Thu nhập khác", Category.CategoryType.INCOME, "plus-circle", "#6B7280")
        );

        for (Category category : defaults) {
            boolean exists = categoryRepository.existsByIsDefaultTrueAndTypeAndNameIgnoreCase(
                    category.getType(),
                    category.getName()
            );

            if (!exists) {
                categoryRepository.save(category);
            }
        }
    }

    private Category createDefault(String name, Category.CategoryType type, String icon, String color) {
        return Category.builder()
                .name(name)
                .type(type)
                .icon(icon)
                .color(color)
                .isDefault(true)
                .build();
    }
}