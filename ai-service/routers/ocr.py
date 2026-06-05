from fastapi import APIRouter, UploadFile, File
from services.ocr_service import extract_receipt

router = APIRouter()

@router.post("/scan-receipt")
async def scan_receipt(image: UploadFile = File(...)):
    result = await extract_receipt(image)
    return result
