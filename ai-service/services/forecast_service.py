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
        user=os.getenv("DB_USER", "smartspend"),
        password=os.getenv("DB_PASSWORD", "smartspend123"),
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

        cursor.execute("""
            SELECT id, amount, transaction_date, category_id
            FROM transactions
            WHERE user_id = %s AND type = 'EXPENSE'
            ORDER BY transaction_date DESC LIMIT 100
        """, (user_id,))
        rows = cursor.fetchall()
        cursor.close()
        db.close()

        if len(rows) < 10:
            return {"success": True, "anomalies": [], "message": "Cần thêm dữ liệu để phát hiện bất thường"}

        amounts = np.array([[float(r[1])] for r in rows])
        model = IsolationForest(contamination=0.1, random_state=42)
        predictions = model.fit_predict(amounts)
        scores = model.score_samples(amounts)

        anomalies = []
        for i, (row, pred, score) in enumerate(zip(rows, predictions, scores)):
            if pred == -1:
                anomalies.append({
                    "transaction_id": row[0],
                    "amount": float(row[1]),
                    "date": str(row[2]),
                    "anomaly_score": float(abs(score)),
                })

        return {"success": True, "anomalies": anomalies}
    except Exception as e:
        return {"success": False, "error": str(e)}
