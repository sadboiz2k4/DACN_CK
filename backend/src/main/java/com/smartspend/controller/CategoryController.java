package com.smartspend.controller;

import com.smartspend.dto.category.CategoryRequest;
import com.smartspend.entity.Category;
import com.smartspend.entity.User;
import com.smartspend.repository.CategoryRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<Category>> getCategories(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(categoryRepository.findAllByUserId(user.getId()));
    }

    @PostMapping
    public ResponseEntity<Category> createCategory(@AuthenticationPrincipal User user,
                                                    @Valid @RequestBody CategoryRequest request) {
        Category category = Category.builder()
                .user(user)
                .name(request.getName())
                .type(request.getType())
                .icon(request.getIcon())
                .color(request.getColor())
                .isDefault(false)
                .build();
        return ResponseEntity.ok(categoryRepository.save(category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@AuthenticationPrincipal User user,
                                               @PathVariable Long id) {
        categoryRepository.findById(id)
                .filter(c -> c.getUser() != null && c.getUser().getId().equals(user.getId()))
                .ifPresent(categoryRepository::delete);
        return ResponseEntity.noContent().build();
    }
}
