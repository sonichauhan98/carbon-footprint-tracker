"""Shared Pydantic schemas for API request and response models."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DietType(str, Enum):
    HEAVY_MEAT = "heavy_meat"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"


class CarbonInput(BaseModel):
    """Daily lifestyle inputs submitted by the user."""

    driving_km_per_day: float = Field(..., ge=0, le=1000)
    electricity_kwh_per_day: float = Field(..., ge=0, le=500)
    diet_type: DietType
    food_waste_kg_per_day: float = Field(..., ge=0, le=50)

    @field_validator(
        "driving_km_per_day",
        "electricity_kwh_per_day",
        "food_waste_kg_per_day",
        mode="before",
    )
    @classmethod
    def reject_negative_values(cls, value: float) -> float:
        if isinstance(value, (int, float)) and value < 0:
            raise ValueError("Values must be zero or positive.")
        return value


class CategoryBreakdown(BaseModel):
    driving_kg: float
    electricity_kg: float
    diet_kg: float
    food_waste_kg: float


class BenchmarkComparison(BaseModel):
    global_average_kg: float
    paris_target_kg: float
    difference_from_global_kg: float
    difference_from_paris_kg: float
    percent_of_global_average: float
    percent_of_paris_target: float
    meets_paris_target: bool
    below_global_average: bool


class CarbonResponse(BaseModel):
    """Structured carbon calculation consumed by the frontend and insights API."""

    total_kg_co2e: float
    breakdown: CategoryBreakdown
    benchmarks: BenchmarkComparison
    unit: Literal["kg CO2e/year"] = "kg CO2e/year"


class CarbonHack(BaseModel):
    title: str
    tip: str
    estimated_savings_kg: float
    sector: Literal["driving", "electricity", "diet", "food_waste"]


class InsightsResponse(BaseModel):
    source: Literal["gemini", "rules"]
    primary_sector: Literal["driving", "electricity", "diet", "food_waste"]
    hacks: list[CarbonHack]
