"""FastAPI application for the Carbon Footprint Awareness Platform."""

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.carbon.factors import (
    DAYS_PER_YEAR,
    DIET_ANNUAL_KG,
    ELECTRICITY_KG_PER_KWH,
    FOOD_WASTE_KG_PER_KG,
    GASOLINE_CAR_KG_PER_KM,
    GLOBAL_AVERAGE_ANNUAL_KG,
    PARIS_TARGET_ANNUAL_KG,
)
from app.routes.insights import router as insights_router
from app.schemas import (
    BenchmarkComparison,
    CarbonInput,
    CarbonResponse,
    CategoryBreakdown,
)

app = FastAPI(
    title="Carbon Footprint Awareness Platform",
    description="Calculate personal carbon emissions from daily lifestyle inputs.",
    version="1.0.0",
)

# CORS only needed for local split dev (Vite :5173 → API :8000).
# In production the single container serves UI + API from the same origin.
if os.getenv("ENV", "production") == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["POST", "GET"],
        allow_headers=["Content-Type"],
    )

app.include_router(insights_router)


def _round_kg(value: float) -> float:
    return round(value, 2)


def calculate_carbon_footprint(payload: CarbonInput) -> CarbonResponse:
    """Normalize daily inputs to annual kg CO2e and compare against benchmarks."""
    driving_kg = payload.driving_km_per_day * DAYS_PER_YEAR * GASOLINE_CAR_KG_PER_KM
    electricity_kg = (
        payload.electricity_kwh_per_day * DAYS_PER_YEAR * ELECTRICITY_KG_PER_KWH
    )
    diet_kg = DIET_ANNUAL_KG[payload.diet_type.value]
    food_waste_kg = (
        payload.food_waste_kg_per_day * DAYS_PER_YEAR * FOOD_WASTE_KG_PER_KG
    )

    total = driving_kg + electricity_kg + diet_kg + food_waste_kg

    benchmarks = BenchmarkComparison(
        global_average_kg=GLOBAL_AVERAGE_ANNUAL_KG,
        paris_target_kg=PARIS_TARGET_ANNUAL_KG,
        difference_from_global_kg=_round_kg(total - GLOBAL_AVERAGE_ANNUAL_KG),
        difference_from_paris_kg=_round_kg(total - PARIS_TARGET_ANNUAL_KG),
        percent_of_global_average=_round_kg(
            (total / GLOBAL_AVERAGE_ANNUAL_KG) * 100
        ),
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
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/calculate", response_model=CarbonResponse)
def calculate_emissions(payload: CarbonInput) -> CarbonResponse:
    """Calculate annual carbon footprint from daily lifestyle inputs."""
    try:
        return calculate_carbon_footprint(payload)
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid calculation input.") from exc


def _mount_frontend_static(app: FastAPI) -> None:
    """Serve compiled React assets from / when the static directory exists."""
    static_dir = Path(os.getenv("STATIC_DIR", Path(__file__).resolve().parent.parent / "static"))
    index_file = static_dir / "index.html"

    if not index_file.is_file():
        return

    app.mount(
        "/",
        StaticFiles(directory=str(static_dir), html=True),
        name="frontend",
    )


_mount_frontend_static(app)
