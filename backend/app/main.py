import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.carbon.factors import *
from app.routes.insights import router as insights_router
from app.schemas import BenchmarkComparison, CarbonInput, CarbonResponse, CategoryBreakdown

app = FastAPI(title="Carbon Footprint Awareness Platform")

# Force CORS to be completely open so Render frontend can talk to it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insights_router)

def _round_kg(value: float) -> float:
    return round(value, 2)

def calculate_carbon_footprint(payload: CarbonInput) -> CarbonResponse:
    driving_kg = payload.driving_km_per_day * DAYS_PER_YEAR * GASOLINE_CAR_KG_PER_KM
    electricity_kg = payload.electricity_kwh_per_day * DAYS_PER_YEAR * ELECTRICITY_KG_PER_KWH
    diet_kg = DIET_ANNUAL_KG[payload.diet_type.value]
    food_waste_kg = payload.food_waste_kg_per_day * DAYS_PER_YEAR * FOOD_WASTE_KG_PER_KG
    total = driving_kg + electricity_kg + diet_kg + food_waste_kg

    benchmarks = BenchmarkComparison(
        global_average_kg=GLOBAL_AVERAGE_ANNUAL_KG,
        paris_target_kg=PARIS_TARGET_ANNUAL_KG,
        difference_from_global_kg=_round_kg(total - GLOBAL_AVERAGE_ANNUAL_KG),
        difference_from_paris_kg=_round_kg(total - PARIS_TARGET_ANNUAL_KG),
        percent_of_global_average=_round_kg((total / GLOBAL_AVERAGE_ANNUAL_KG) * 100),
        percent_of_paris_target=_round_kg((total / PARIS_TARGET_ANNUAL_KG) * 100),
        meets_paris_target=total <= PARIS_TARGET_ANNUAL_KG,
        below_global_average=total < GLOBAL_AVERAGE_ANNUAL_KG,
    )
    return CarbonResponse(
        total_kg_co2e=_round_kg(total),
        breakdown=CategoryBreakdown(
            driving_kg=_round_kg(driving_kg),
            electricity_kg=_round_kg(electricity_kg),
            diet_kg=_round_kg(diet_kg),
            food_waste_kg=_round_kg(food_waste_kg),
        ),
        benchmarks=benchmarks,
    )

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/calculate", response_model=CarbonResponse)
def calculate_emissions(payload: CarbonInput):
    try:
        return calculate_carbon_footprint(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid input.")
