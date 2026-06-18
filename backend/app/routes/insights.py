"""Carbon insight generation via Gemini (Vertex AI) with deterministic rule fallback."""

from __future__ import annotations

import json
import logging
import os
from typing import Literal

from fastapi import APIRouter

from app.carbon.factors import DIET_ANNUAL_KG, GASOLINE_CAR_KG_PER_KM
from app.schemas import CarbonHack, CarbonResponse, InsightsResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["insights"])

Sector = Literal["driving", "electricity", "diet", "food_waste"]

SECTOR_LABELS: dict[Sector, str] = {
    "driving": "Driving",
    "electricity": "Electricity",
    "diet": "Diet",
    "food_waste": "Food waste",
}

RULE_TIPS: dict[Sector, dict[str, str | float]] = {
    "driving": {
        "title": "Swap one weekly solo drive for transit",
        "tip_template": (
            "Replace {km} km of gasoline driving per week with public transit, "
            "carpooling, or cycling. At {factor} kg CO2e/km, that removes roughly "
            "{savings} kg CO2e from your annual footprint."
        ),
        "reduction_ratio": 0.10,
        "factor": GASOLINE_CAR_KG_PER_KM,
        "weekly_km_basis": 50,
    },
    "electricity": {
        "title": "Trim standby power and switch to LEDs",
        "tip_template": (
            "Cut household electricity by {percent}% through LED bulbs, smart power "
            "strips, and efficient appliance settings. That saves about {savings} kg "
            "CO2e per year from your current {current} kg electricity emissions."
        ),
        "reduction_ratio": 0.15,
    },
    "diet": {
        "title": "Shift toward a lower-carbon plate",
        "tip_template": (
            "Move one step down the diet ladder (e.g., heavy meat → vegetarian, or "
            "vegetarian → vegan). A vegetarian pattern saves about {veg_savings} kg "
            "CO2e/year versus heavy meat; vegan saves about {vegan_savings} kg CO2e/year."
        ),
        "veg_savings": DIET_ANNUAL_KG["heavy_meat"] - DIET_ANNUAL_KG["vegetarian"],
        "vegan_savings": DIET_ANNUAL_KG["heavy_meat"] - DIET_ANNUAL_KG["vegan"],
    },
    "food_waste": {
        "title": "Halve edible food waste with meal planning",
        "tip_template": (
            "Plan weekly meals and store leftovers properly to cut food waste by 50%. "
            "That would avoid roughly {savings} kg CO2e per year from your current "
            "{current} kg food-waste emissions."
        ),
        "reduction_ratio": 0.50,
    },
}


def _sector_entries(breakdown: CarbonResponse) -> list[tuple[Sector, float]]:
    return sorted(
        [
            ("driving", breakdown.breakdown.driving_kg),
            ("electricity", breakdown.breakdown.electricity_kg),
            ("diet", breakdown.breakdown.diet_kg),
            ("food_waste", breakdown.breakdown.food_waste_kg),
        ],
        key=lambda item: item[1],
        reverse=True,
    )


def _estimate_rule_savings(sector: Sector, amount_kg: float) -> float:
    rule = RULE_TIPS[sector]
    ratio = float(rule.get("reduction_ratio", 0.10))
    if sector == "diet":
        return round(float(rule["veg_savings"]), 2)
    return round(amount_kg * ratio, 2)


def _build_rule_tip(sector: Sector, amount_kg: float) -> CarbonHack:
    rule = RULE_TIPS[sector]
    savings = _estimate_rule_savings(sector, amount_kg)

    if sector == "driving":
        weekly_km = float(rule["weekly_km_basis"])
        factor = float(rule["factor"])
        tip = str(rule["tip_template"]).format(
            km=int(weekly_km * float(rule["reduction_ratio"]) * 10),
            factor=factor,
            savings=f"{savings:,.0f}",
        )
    elif sector == "electricity":
        percent = int(float(rule["reduction_ratio"]) * 100)
        tip = str(rule["tip_template"]).format(
            percent=percent,
            savings=f"{savings:,.0f}",
            current=f"{amount_kg:,.0f}",
        )
    elif sector == "diet":
        tip = str(rule["tip_template"]).format(
            veg_savings=f"{float(rule['veg_savings']):,.0f}",
            vegan_savings=f"{float(rule['vegan_savings']):,.0f}",
        )
    else:
        tip = str(rule["tip_template"]).format(
            savings=f"{savings:,.0f}",
            current=f"{amount_kg:,.0f}",
        )

    return CarbonHack(
        title=str(rule["title"]),
        tip=tip,
        estimated_savings_kg=savings,
        sector=sector,
    )


def generate_rule_insights(footprint: CarbonResponse) -> InsightsResponse:
    """Deterministic fallback targeting the user's highest emission sectors."""
    ranked = _sector_entries(footprint)
    primary_sector = ranked[0][0]

    hacks: list[CarbonHack] = []
    for sector, amount_kg in ranked[:3]:
        hacks.append(_build_rule_tip(sector, amount_kg))

    while len(hacks) < 3:
        hacks.append(
            CarbonHack(
                title="Track progress monthly",
                tip=(
                    f"Your total footprint is {footprint.total_kg_co2e:,.0f} kg CO2e/year. "
                    f"Re-measure monthly; staying below the Paris target of "
                    f"{footprint.benchmarks.paris_target_kg:,.0f} kg CO2e/year requires "
                    f"roughly {max(footprint.total_kg_co2e - footprint.benchmarks.paris_target_kg, 0):,.0f} "
                    "kg of additional reductions."
                ),
                estimated_savings_kg=round(
                    max(
                        footprint.total_kg_co2e - footprint.benchmarks.paris_target_kg,
                        0,
                    ),
                    2,
                ),
                sector=primary_sector,
            )
        )

    return InsightsResponse(
        source="rules",
        primary_sector=primary_sector,
        hacks=hacks[:3],
    )


def _gemini_enabled() -> bool:
    return os.getenv("USE_GEMINI", "false").strip().lower() == "true"


def _build_gemini_prompt(footprint: CarbonResponse, primary_sector: Sector) -> str:
    breakdown = footprint.breakdown
    return f"""You are a witty sustainability coach. Based on this annual carbon footprint (kg CO2e/year):
- Driving: {breakdown.driving_kg}
- Electricity: {breakdown.electricity_kg}
- Diet: {breakdown.diet_kg}
- Food waste: {breakdown.food_waste_kg}
- Total: {footprint.total_kg_co2e}
- Highest sector: {primary_sector} ({SECTOR_LABELS[primary_sector]})

Return ONLY valid JSON (no markdown) with this exact shape:
{{
  "hacks": [
    {{
      "title": "short punchy title",
      "tip": "clever personalized advice with quantified kg CO2e savings",
      "estimated_savings_kg": 123.45,
      "sector": "driving|electricity|diet|food_waste"
    }}
  ]
}}
Provide exactly 3 hacks. Prioritize the largest sectors. Be clever but practical. Use realistic savings numbers."""


def _parse_gemini_json(raw_text: str) -> list[CarbonHack]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    payload = json.loads(cleaned)
    hacks_raw = payload.get("hacks", [])
    hacks: list[CarbonHack] = []
    for item in hacks_raw[:3]:
        hacks.append(
            CarbonHack(
                title=str(item["title"]),
                tip=str(item["tip"]),
                estimated_savings_kg=round(float(item["estimated_savings_kg"]), 2),
                sector=item["sector"],
            )
        )
    if len(hacks) != 3:
        raise ValueError("Gemini response did not contain exactly 3 hacks.")
    return hacks


def generate_gemini_insights(footprint: CarbonResponse) -> InsightsResponse:
    """Call Gemini 1.5 Flash on Vertex AI using Application Default Credentials."""
    from google import genai

    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is required when USE_GEMINI=true.")

    primary_sector = _sector_entries(footprint)[0][0]
    prompt = _build_gemini_prompt(footprint, primary_sector)

    client = genai.Client(vertexai=True, project=project, location=location)
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt,
    )

    raw_text = response.text
    if not raw_text:
        raise RuntimeError("Gemini returned an empty response.")

    hacks = _parse_gemini_json(raw_text)
    return InsightsResponse(
        source="gemini",
        primary_sector=primary_sector,
        hacks=hacks,
    )


def generate_insights(footprint: CarbonResponse) -> InsightsResponse:
    """Try Gemini when enabled; always fall back to the rule engine on failure."""
    if not _gemini_enabled():
        logger.info("USE_GEMINI is disabled — using rule-based insights.")
        return generate_rule_insights(footprint)

    try:
        return generate_gemini_insights(footprint)
    except Exception as exc:
        logger.warning("Gemini unavailable, falling back to rules: %s", exc)
        return generate_rule_insights(footprint)


@router.post("/insights", response_model=InsightsResponse)
def get_insights(footprint: CarbonResponse) -> InsightsResponse:
    """Generate personalized carbon hacks from a calculated footprint."""
    return generate_insights(footprint)
