from fastapi import APIRouter
from services.forecast_service import get_forecast, get_anomalies

router = APIRouter()

@router.get("/forecast/{user_id}")
async def forecast(user_id: int):
    return await get_forecast(user_id)

@router.get("/anomalies/{user_id}")
async def anomalies(user_id: int):
    return await get_anomalies(user_id)
