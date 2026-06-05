from fastapi import APIRouter
from pydantic import BaseModel
from services.gemini_service import parse_transaction_text

router = APIRouter()

class TextInput(BaseModel):
    text: str

@router.post("/parse-transaction")
async def parse_transaction(body: TextInput):
    result = await parse_transaction_text(body.text)
    return result
