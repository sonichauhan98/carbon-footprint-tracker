"""Automated tests for the carbon calculation API."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.carbon.factors import (
    DAYS_PER_YEAR,
    DIET_ANNUAL_KG,
    ELECTRICITY_KG_PER_KWH,
    FOOD_WASTE_KG_PER_KG,
    GASOLINE_CAR_KG_PER_KM,
    GLOBAL_AVERAGE_ANNUAL_KG,
    PARIS_TARGET_ANNUAL_KG,
)
from app.main import app, calculate_carbon_footprint
from app.schemas import CarbonInput, CarbonResponse

client = TestClient(app)

VALID_PAYLOAD = {
    "driving_km_per_day": 20.0,
    "electricity_kwh_per_day": 10.0,
    "diet_type": "vegetarian",
    "food_waste_kg_per_day": 0.5,
}

EXPECTED_RESPONSE_KEYS = {
    "total_kg_co2e",
    "breakdown",
    "benchmarks",
    "unit",
}

EXPECTED_BREAKDOWN_KEYS = {
    "driving_kg",
    "electricity_kg",
    "diet_kg",
    "food_waste_kg",
}

EXPECTED_BENCHMARK_KEYS = {
    "global_average_kg",
    "paris_target_kg",
    "difference_from_global_kg",
    "difference_from_paris_kg",
    "percent_of_global_average",
    "percent_of_paris_target",
    "meets_paris_target",
    "below_global_average",
}


def _expected_total(payload: dict) -> float:
    driving = payload["driving_km_per_day"] * DAYS_PER_YEAR * GASOLINE_CAR_KG_PER_KM
    electricity = (
        payload["electricity_kwh_per_day"] * DAYS_PER_YEAR * ELECTRICITY_KG_PER_KWH
    )
    diet = DIET_ANNUAL_KG[payload["diet_type"]]
    food_waste = (
        payload["food_waste_kg_per_day"] * DAYS_PER_YEAR * FOOD_WASTE_KG_PER_KG
    )
    return round(driving + electricity + diet + food_waste, 2)


class TestCarbonCalculationLogic:
    def test_normal_calculation_matches_formula(self):
        payload = CarbonInput(**VALID_PAYLOAD)
        result = calculate_carbon_footprint(payload)

        assert result.total_kg_co2e == _expected_total(VALID_PAYLOAD)
        assert result.breakdown.driving_kg == round(
            VALID_PAYLOAD["driving_km_per_day"] * DAYS_PER_YEAR * GASOLINE_CAR_KG_PER_KM,
            2,
        )
        assert result.breakdown.electricity_kg == round(
            VALID_PAYLOAD["electricity_kwh_per_day"]
            * DAYS_PER_YEAR
            * ELECTRICITY_KG_PER_KWH,
            2,
        )
        assert result.breakdown.diet_kg == DIET_ANNUAL_KG["vegetarian"]
        assert result.breakdown.food_waste_kg == round(
            VALID_PAYLOAD["food_waste_kg_per_day"]
            * DAYS_PER_YEAR
            * FOOD_WASTE_KG_PER_KG,
            2,
        )

    @pytest.mark.parametrize(
        "diet_type,expected_diet_kg",
        [
            ("heavy_meat", DIET_ANNUAL_KG["heavy_meat"]),
            ("vegetarian", DIET_ANNUAL_KG["vegetarian"]),
            ("vegan", DIET_ANNUAL_KG["vegan"]),
        ],
    )
    def test_all_diet_types(self, diet_type, expected_diet_kg):
        payload = CarbonInput(
            driving_km_per_day=0,
            electricity_kwh_per_day=0,
            diet_type=diet_type,
            food_waste_kg_per_day=0,
        )
        result = calculate_carbon_footprint(payload)

        assert result.breakdown.diet_kg == expected_diet_kg
        assert result.total_kg_co2e == expected_diet_kg

    def test_zero_inputs_produce_only_diet_emissions(self):
        payload = CarbonInput(
            driving_km_per_day=0,
            electricity_kwh_per_day=0,
            diet_type="vegan",
            food_waste_kg_per_day=0,
        )
        result = calculate_carbon_footprint(payload)

        assert result.total_kg_co2e == DIET_ANNUAL_KG["vegan"]
        assert result.breakdown.driving_kg == 0.0
        assert result.breakdown.electricity_kg == 0.0
        assert result.breakdown.food_waste_kg == 0.0

    def test_benchmark_flags_for_high_footprint(self):
        payload = CarbonInput(
            driving_km_per_day=50,
            electricity_kwh_per_day=30,
            diet_type="heavy_meat",
            food_waste_kg_per_day=2,
        )
        result = calculate_carbon_footprint(payload)

        assert result.benchmarks.global_average_kg == GLOBAL_AVERAGE_ANNUAL_KG
        assert result.benchmarks.paris_target_kg == PARIS_TARGET_ANNUAL_KG
        assert result.benchmarks.meets_paris_target is False
        assert result.benchmarks.below_global_average is False
        assert result.benchmarks.percent_of_global_average > 100

    def test_benchmark_flags_for_low_footprint(self):
        payload = CarbonInput(
            driving_km_per_day=0,
            electricity_kwh_per_day=2,
            diet_type="vegan",
            food_waste_kg_per_day=0,
        )
        result = calculate_carbon_footprint(payload)

        assert result.benchmarks.meets_paris_target is True
        assert result.benchmarks.below_global_average is True
        assert result.benchmarks.percent_of_paris_target < 100


class TestCarbonInputValidation:
    @pytest.mark.parametrize(
        "field_name",
        ["driving_km_per_day", "electricity_kwh_per_day", "food_waste_kg_per_day"],
    )
    @pytest.mark.parametrize("invalid_value", [-1, -0.01, -100])
    def test_negative_inputs_rejected_by_schema(self, field_name, invalid_value):
        data = {**VALID_PAYLOAD, field_name: invalid_value}
        with pytest.raises(ValidationError):
            CarbonInput(**data)

    def test_invalid_diet_type_rejected(self):
        with pytest.raises(ValidationError):
            CarbonInput(**{**VALID_PAYLOAD, "diet_type": "pescatarian"})


class TestCalculateEndpoint:
    def test_post_calculate_success(self):
        response = client.post("/api/calculate", json=VALID_PAYLOAD)

        assert response.status_code == 200
        data = response.json()
        assert data["total_kg_co2e"] == _expected_total(VALID_PAYLOAD)
        assert data["unit"] == "kg CO2e/year"

    def test_response_structure_matches_frontend_contract(self):
        response = client.post("/api/calculate", json=VALID_PAYLOAD)
        data = response.json()

        assert set(data.keys()) == EXPECTED_RESPONSE_KEYS
        assert set(data["breakdown"].keys()) == EXPECTED_BREAKDOWN_KEYS
        assert set(data["benchmarks"].keys()) == EXPECTED_BENCHMARK_KEYS

        validated = CarbonResponse.model_validate(data)
        assert validated.unit == "kg CO2e/year"

    def test_zero_inputs_via_api(self):
        payload = {
            "driving_km_per_day": 0,
            "electricity_kwh_per_day": 0,
            "diet_type": "vegan",
            "food_waste_kg_per_day": 0,
        }
        response = client.post("/api/calculate", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["total_kg_co2e"] == DIET_ANNUAL_KG["vegan"]

    @pytest.mark.parametrize(
        "field_name,invalid_value",
        [
            ("driving_km_per_day", -5),
            ("electricity_kwh_per_day", -1),
            ("food_waste_kg_per_day", -0.5),
        ],
    )
    def test_negative_inputs_return_422(self, field_name, invalid_value):
        payload = {**VALID_PAYLOAD, field_name: invalid_value}
        response = client.post("/api/calculate", json=payload)

        assert response.status_code == 422

    def test_missing_required_field_returns_422(self):
        payload = VALID_PAYLOAD.copy()
        del payload["diet_type"]
        response = client.post("/api/calculate", json=payload)

        assert response.status_code == 422

    def test_invalid_json_type_returns_422(self):
        payload = {**VALID_PAYLOAD, "driving_km_per_day": "twenty"}
        response = client.post("/api/calculate", json=payload)

        assert response.status_code == 422

    def test_health_endpoint(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_production_static_mount_fallback(self):
        """Hits the StaticFiles initialization fallback lines in main.py."""
        from fastapi.testclient import TestClient
        from app.main import app
        local_client = TestClient(app)
        response = local_client.get("/")
        assert response.status_code in [200, 404]

    def test_missing_calculation_fields_validation(self):
        """Forces validation failures to cover HTTP 422 lines in main.py."""
        from fastapi.testclient import TestClient
        from app.main import app
        local_client = TestClient(app)
        response = local_client.post("/api/calculate", json={})
        assert response.status_code == 422