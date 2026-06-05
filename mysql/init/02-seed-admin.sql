USE smartspend;

-- Tạo tài khoản admin mặc định (password: admin123)
-- BCrypt hash của "admin123"
INSERT IGNORE INTO users (email, password_hash, full_name, role, is_active)
VALUES (
    'admin@smartspend.com',
    '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBpwTpyT.KO.yW',
    'Administrator',
    'ADMIN',
    TRUE
);
