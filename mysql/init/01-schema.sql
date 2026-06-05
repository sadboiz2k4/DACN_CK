CREATE DATABASE IF NOT EXISTS smartspend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartspend;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('CASH', 'BANK', 'E_WALLET') NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'VND',
    color VARCHAR(20) DEFAULT '#4F46E5',
    icon VARCHAR(50) DEFAULT 'wallet',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    name VARCHAR(255) NOT NULL,
    type ENUM('INCOME', 'EXPENSE') NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20) DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    wallet_id BIGINT NOT NULL,
    category_id BIGINT,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    note VARCHAR(500),
    transaction_date DATE NOT NULL,
    source ENUM('MANUAL', 'NLP', 'OCR', 'VOICE') DEFAULT 'MANUAL',
    to_wallet_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (to_wallet_id) REFERENCES wallets(id)
);

CREATE TABLE IF NOT EXISTS ai_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM('NLP', 'OCR', 'VOICE', 'FORECAST', 'ANOMALY') NOT NULL,
    input_text TEXT,
    output_json TEXT,
    tokens_used INT DEFAULT 0,
    is_success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forecasts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    forecast_month DATE NOT NULL,
    predicted_expense DECIMAL(15,2),
    predicted_income DECIMAL(15,2),
    actual_expense DECIMAL(15,2),
    actual_income DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_month (user_id, forecast_month)
);

CREATE TABLE IF NOT EXISTS anomalies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    transaction_id BIGINT NOT NULL,
    anomaly_score DECIMAL(5,4),
    is_reviewed BOOLEAN DEFAULT FALSE,
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Default categories
INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES
(NULL, 'Ăn uống', 'EXPENSE', 'utensils', '#EF4444', TRUE),
(NULL, 'Di chuyển', 'EXPENSE', 'car', '#F97316', TRUE),
(NULL, 'Mua sắm', 'EXPENSE', 'shopping-bag', '#8B5CF6', TRUE),
(NULL, 'Giải trí', 'EXPENSE', 'gamepad', '#EC4899', TRUE),
(NULL, 'Sức khỏe', 'EXPENSE', 'heart', '#10B981', TRUE),
(NULL, 'Hóa đơn & Tiện ích', 'EXPENSE', 'zap', '#F59E0B', TRUE),
(NULL, 'Giáo dục', 'EXPENSE', 'book', '#3B82F6', TRUE),
(NULL, 'Khác', 'EXPENSE', 'more-horizontal', '#6B7280', TRUE),
(NULL, 'Lương', 'INCOME', 'briefcase', '#10B981', TRUE),
(NULL, 'Đầu tư', 'INCOME', 'trending-up', '#3B82F6', TRUE),
(NULL, 'Thưởng', 'INCOME', 'gift', '#F59E0B', TRUE),
(NULL, 'Thu nhập khác', 'INCOME', 'plus-circle', '#6B7280', TRUE);
