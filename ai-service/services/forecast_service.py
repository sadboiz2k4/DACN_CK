import mysql.connector
import os
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import IsolationForest
from datetime import date, timedelta

def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        database=os.getenv("DB_NAME", "smartspend"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
    )

async def get_forecast(user_id: int) -> dict:
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute("""
            SELECT YEAR(transaction_date) as yr, MONTH(transaction_date) as mo, SUM(amount)
            FROM transactions
            WHERE user_id = %s AND type = 'EXPENSE'
            GROUP BY yr, mo ORDER BY yr, mo
        """, (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        if len(rows) < 2:
            return {"success": True, "predicted_expense": 0, "message": "Cần thêm dữ liệu để dự báo"}

        X = np.array([[i] for i in range(len(rows))])
        y = np.array([float(r[2]) for r in rows])

        model = LinearRegression()
        model.fit(X, y)

        next_month_idx = len(rows)
        predicted = float(model.predict([[next_month_idx]])[0])
        avg = float(np.mean(y))

        budget_warning = predicted > avg * 1.2

        return {
            "success": True,
            "predicted_expense": max(0, predicted),
            "average_expense": avg,
            "budget_warning": budget_warning,
            "warning_message": f"Dự báo chi tiêu tháng tới cao hơn 20% mức trung bình!" if budget_warning else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def get_anomalies(user_id: int) -> dict:
    try:
        db = get_db()
        cursor = db.cursor()

        # Lấy 200 giao dịch EXPENSE gần nhất kèm tên danh mục
        cursor.execute("""
            SELECT t.id, t.amount, t.transaction_date, t.category_id,
                   COALESCE(c.name, 'Khác') as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = %s AND t.type = 'EXPENSE'
            ORDER BY t.transaction_date DESC
            LIMIT 200
        """, (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        if len(rows) < 10:
            return {"success": True, "anomalies": [], "message": "Cần thêm dữ liệu để phát hiện bất thường"}

        amounts    = np.array([float(r[1]) for r in rows])
        dates      = [r[2] for r in rows]          # datetime.date
        cat_ids    = np.array([r[3] if r[3] else 0 for r in rows], dtype=float)
        cat_names  = [r[4] for r in rows]

        # --- Feature 1: amount gốc ---
        f_amount = amounts

        # --- Feature 2: z-score amount trong cùng danh mục ---
        # (so sánh giao dịch với mức chi tiêu bình thường của chính danh mục đó)
        f_cat_zscore = np.zeros(len(rows))
        unique_cats = np.unique(cat_ids)
        for cat in unique_cats:
            mask = cat_ids == cat
            cat_amounts = amounts[mask]
            if len(cat_amounts) > 1:
                mu, sigma = cat_amounts.mean(), cat_amounts.std()
                if sigma > 0:
                    f_cat_zscore[mask] = (cat_amounts - mu) / sigma
                # nếu sigma == 0 (tất cả bằng nhau) → zscore = 0 (bình thường)

        # --- Feature 3: ngày trong tuần (0=Thứ 2 ... 6=Chủ nhật) ---
        f_dow = np.array([d.weekday() for d in dates], dtype=float)

        # --- Feature 4: ngày trong tháng (1-31) ---
        f_dom = np.array([d.day for d in dates], dtype=float)

        # --- Feature 5: encoded category (normalize về 0-1) ---
        cat_max = cat_ids.max() if cat_ids.max() > 0 else 1.0
        f_cat = cat_ids / cat_max

        # Kết hợp 5 features, scale amount và zscore để cân bằng trọng số
        amount_max = amounts.max() if amounts.max() > 0 else 1.0
        X = np.column_stack([
            f_amount / amount_max,       # [0-1] – quan trọng nhất
            f_cat_zscore / 5.0,          # z-score chuẩn hóa, trọng số cao
            f_dow / 6.0,                 # [0-1]
            f_dom / 31.0,                # [0-1]
            f_cat,                       # [0-1]
        ])

        model = IsolationForest(contamination=0.1, n_estimators=200, random_state=42)
        predictions = model.fit_predict(X)
        scores = model.score_samples(X)

        # Tính ngưỡng amount trung bình và median để giải thích lý do
        avg_amount = float(np.mean(amounts))
        median_amount = float(np.median(amounts))

        anomalies = []
        for i, (row, pred, score) in enumerate(zip(rows, predictions, scores)):
            if pred == -1:
                amt = float(row[1])
                zscore = float(f_cat_zscore[i])
                dow = int(f_dow[i])
                dom = int(f_dom[i])
                cat_name = cat_names[i]

                # Tạo lý do giải thích bằng tiếng Việt
                reasons = []
                if amt > avg_amount * 2:
                    reasons.append(f"Số tiền gấp {amt/avg_amount:.1f}x mức trung bình")
                elif amt > avg_amount * 1.5:
                    reasons.append(f"Số tiền cao hơn {((amt/avg_amount-1)*100):.0f}% mức trung bình")
                if abs(zscore) > 2:
                    reasons.append(f"Bất thường so với chi tiêu '{cat_name}' thông thường")
                if dow >= 5:  # Thứ 7, Chủ nhật
                    reasons.append("Chi tiêu cuối tuần bất thường")
                if not reasons:
                    reasons.append("Kết hợp nhiều yếu tố bất thường")

                anomalies.append({
                    "transaction_id": row[0],
                    "amount": amt,
                    "date": str(row[2]),
                    "category_name": cat_name,
                    "anomaly_score": float(abs(score)),
                    "reason": " · ".join(reasons),
                    "avg_amount": avg_amount,
                })

        # Sắp xếp theo mức độ bất thường giảm dần
        anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)

        return {"success": True, "anomalies": anomalies}
    except Exception as e:
        return {"success": False, "error": str(e)}
