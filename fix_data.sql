SET NAMES utf8mb4;
DELETE FROM transactions WHERE user_id = 2;

INSERT INTO transactions (user_id, wallet_id, category_id, amount, type, note, transaction_date, source, created_at) VALUES
(2, 3, 1,  55000,    'EXPENSE', 'Bữa trưa văn phòng',   '2026-06-06', 'MANUAL', NOW()),
(2, 3, 3,  890000,   'EXPENSE', 'Mua đồ gia đình',       '2026-06-06', 'MANUAL', NOW()),
(2, 3, 5,  500000,   'EXPENSE', 'Học phí tiếng Anh',     '2026-06-06', 'MANUAL', NOW()),
(2, 3, 1,  75000,    'EXPENSE', 'Cơm văn phòng',          '2026-06-05', 'MANUAL', NOW()),
(2, 3, 6,  150000,   'EXPENSE', 'Thuốc cảm cúm',          '2026-06-05', 'MANUAL', NOW()),
(2, 3, 2,  80000,    'EXPENSE', 'Grab đi làm',            '2026-06-05', 'MANUAL', NOW()),
(2, 3, 2,  45000,    'EXPENSE', 'Xăng xe máy',            '2026-06-04', 'MANUAL', NOW()),
(2, 3, 7,  200000,   'EXPENSE', 'Tiền điện tháng 6',      '2026-06-04', 'MANUAL', NOW()),
(2, 3, 3,  320000,   'EXPENSE', 'Quần áo sale',           '2026-06-03', 'MANUAL', NOW()),
(2, 3, 1,  120000,   'EXPENSE', 'Ăn tối cùng bạn bè',    '2026-06-03', 'MANUAL', NOW()),
(2, 3, 9,  15000000, 'INCOME',  'Lương tháng 6',          '2026-06-01', 'MANUAL', NOW()),
(2, 3, 10, 500000,   'INCOME',  'Thưởng dự án Q2',        '2026-06-02', 'MANUAL', NOW()),
(2, 3, 1,  35000,    'EXPENSE', 'Cà phê sáng',            '2026-06-02', 'MANUAL', NOW()),
(2, 3, 4,  250000,   'EXPENSE', 'Sách lập trình',         '2026-06-01', 'MANUAL', NOW()),
(2, 3, 8,  180000,   'EXPENSE', 'Ăn nhà hàng sinh nhật', '2026-05-30', 'MANUAL', NOW());

UPDATE wallets SET name = 'Ví chính', balance = 9900000 WHERE id = 3 AND user_id = 2;
