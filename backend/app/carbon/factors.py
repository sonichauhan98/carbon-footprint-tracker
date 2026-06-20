"""Source-cited emission factors for carbon footprint calculations.

All values are expressed in kilograms of CO2 equivalent (kg CO2e) unless noted.
Factors are drawn from authoritative government and peer-reviewed sources.
"""

from enum import Enum
from typing import Final, TypedDict


class DietType(str, Enum):
    HEAVY_MEAT = "heavy_meat"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"


class DietFactors(TypedDict):
    heavy_meat: float
    vegetarian: float
    vegan: float


# ---------------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------------

# EPA (2024): typical passenger vehicle emits ~404 g CO2/mile tailpipe.
# Conversion: 404 g/mile ÷ 1.60934 km/mile ≈ 0.251 kg CO2e/km.
# Source: https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle
GASOLINE_CAR_KG_PER_KM: Final[float] = 0.251

# ---------------------------------------------------------------------------
# Energy
# ---------------------------------------------------------------------------

# EPA eGRID (2022): U.S. national weighted average total output emission rate.
# 386.5 g CO2e/kWh = 0.3865 kg CO2e/kWh.
# Source: https://www.epa.gov/egrid
ELECTRICITY_KG_PER_KWH: Final[float] = 0.3865

# ---------------------------------------------------------------------------
# Diet (annual footprint by dietary pattern)
# ---------------------------------------------------------------------------

# Scarborough et al. (2014), Climatic Change — daily diet emissions converted to annual.
# High meat (>100 g meat/day): 7.19 kg CO2e/day × 365 ≈ 2,624 kg CO2e/year.
# Vegetarian: 3.81 kg CO2e/day × 365 ≈ 1,391 kg CO2e/year.
# Vegan: 2.89 kg CO2e/day × 365 ≈ 1,055 kg CO2e/year.
# Source: https://doi.org/10.1007/s10584-014-1169-1
DIET_ANNUAL_KG: Final[DietFactors] = {
    DietType.HEAVY_MEAT.value: 2624.0,
    DietType.VEGETARIAN.value: 1391.0,
    DietType.VEGAN.value: 1055.0,
}

# ---------------------------------------------------------------------------
# Food waste
# ---------------------------------------------------------------------------

# DEFRA (2024) GHG Conversion Factors: food and drink waste sent to landfill.
# 0.700 kg CO2e per kg of waste.
# Source: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024
FOOD_WASTE_KG_PER_KG: Final[float] = 0.700

# ---------------------------------------------------------------------------
# Benchmarks (kg CO2e per person per year)
# ---------------------------------------------------------------------------

# Global per-capita average ≈ 4.7 tonnes CO2e/year (World Bank / Our World in Data, 2022).
# Source: https://ourworldindata.org/co2-emissions
GLOBAL_AVERAGE_ANNUAL_KG: Final[float] = 4700.0

# IPCC SR1.5 pathways: ~2 tonnes CO2e/person/year by 2050 for 1.5 °C alignment.
# Source: https://www.ipcc.ch/sr15/
PARIS_TARGET_ANNUAL_KG: Final[float] = 2000.0

DAYS_PER_YEAR: Final[int] = 365
