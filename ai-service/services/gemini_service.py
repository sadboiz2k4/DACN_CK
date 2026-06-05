import google.generativeai as genai
import json
import os
from datetime import date

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

SYSTEM_PROMPT = """Bạn là trợ lý tài chính. Phân tích câu lệnh người dùng và trích xuất thông tin giao dịch.
Trả về JSON với định dạng:
{
  "success": true/false,
  "transaction": {
    "amount": <số tiền, int>,
    "type": "INCOME" | "EXPENSE",
    "categoryName": "<tên danh mục phù hợp>",
    "note": "<ghi chú>",
    "date": "<YYYY-MM-DD>"
  },
  "message": "<thông báo nếu không phân tích được>"
}

Các danh mục chi tiêu: Ăn uống, Di chuyển, Mua sắm, Giải trí, Sức khỏe, Hóa đơn & Tiện ích, Giáo dục, Khác
Các danh mục thu nhập: Lương, Đầu tư, Thưởng, Thu nhập khác

Quy tắc phân tích:
- "k" hoặc "nghìn" = 1,000 VND
- "tr", "triệu" = 1,000,000 VND
- "đồng", "d" = 1 VND
- Nếu không có ngày, dùng ngày hôm nay
- Nếu không xác định được giao dịch, trả về success: false"""

model = genai.GenerativeModel("gemini-pro")

async def parse_transaction_text(text: str) -> dict:
    try:
        today = date.today().isoformat()
        prompt = f"{SYSTEM_PROMPT}\n\nHôm nay là {today}.\n\nCâu lệnh người dùng: \"{text}\"\n\nJSON:"

        response = model.generate_content(prompt)
        raw = response.text.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw.strip())
        return result
    except Exception as e:
        return {
            "success": False,
            "message": f"Không thể phân tích câu lệnh. Hãy thử lại với cú pháp rõ ràng hơn.",
            "error": str(e)
        }
