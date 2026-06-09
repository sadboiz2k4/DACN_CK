try:
    import easyocr
    EASYOCR_AVAILABLE = True
except Exception:
    EASYOCR_AVAILABLE = False

import google.generativeai as genai
from fastapi import UploadFile
from PIL import Image
import io
import json
import os
from datetime import date

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

reader = None

def get_reader():
    global reader
    if not EASYOCR_AVAILABLE:
        raise RuntimeError("easyocr không khả dụng trên máy này (lỗi torch DLL)")
    if reader is None:
        reader = easyocr.Reader(['vi', 'en'], gpu=False)
    return reader

async def extract_receipt(image_file: UploadFile) -> dict:
    try:
        contents = await image_file.read()
        img = Image.open(io.BytesIO(contents))

        ocr_reader = get_reader()
        results = ocr_reader.readtext(img)
        extracted_text = "\n".join([text for (_, text, conf) in results if conf > 0.5])

        if not extracted_text.strip():
            return {"success": False, "message": "Không đọc được văn bản từ ảnh"}

        model = genai.GenerativeModel("gemini-pro")
        prompt = f"""Từ văn bản hóa đơn sau, trích xuất thông tin:
{extracted_text}

Trả về JSON:
{{
  "success": true,
  "merchant": "<tên cửa hàng>",
  "transaction": {{
    "amount": <tổng tiền, int>,
    "type": "EXPENSE",
    "categoryName": "<danh mục phù hợp>",
    "note": "<tên cửa hàng hoặc mô tả>",
    "date": "<YYYY-MM-DD hoặc ngày hôm nay nếu không có>"
  }},
  "items": [
    {{"name": "<tên hàng>", "quantity": <số lượng>, "price": <giá>}}
  ]
}}

Ngày hôm nay: {date.today().isoformat()}
Nếu không phải hóa đơn, trả về success: false."""

        response = model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw.strip())
    except Exception as e:
        return {"success": False, "message": "Lỗi xử lý ảnh", "error": str(e)}
