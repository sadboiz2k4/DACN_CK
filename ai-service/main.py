from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import nlp, ocr, forecast
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SmartSpend AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nlp.router, prefix="/ai", tags=["NLP"])
app.include_router(ocr.router, prefix="/ai", tags=["OCR"])
app.include_router(forecast.router, prefix="/ai", tags=["Forecast"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "SmartSpend AI"}
