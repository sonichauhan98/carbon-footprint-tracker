"""Automated tests for the insights API and rule-engine fallback."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes.insights import generate_rule_insights
from app.schemas import CarbonHack, CarbonResponse, InsightsResponse

client = TestClient(app)

SAMPLE_FOOTPRINT = {
    "total_kg_co2e": 5000.0,
    "breakdown": {
        "driving_kg": 2500.0,
        "electricity_kg": 900.0,
        "diet_kg": 1391.0,
        "food_waste_kg": 209.0,
    },
    "benchmarks": {
        "global_average_kg": 4700.0,
        "paris_target_kg": 2000.0,
        "difference_from_global_kg": 300.0,
        "difference_from_paris_kg": 3000.0,
        "percent_of_global_average": 106.38,
        "percent_of_paris_target": 250.0,
        "meets_paris_target": False,
        "below_global_average": False,
    },
    "unit": "kg CO2e/year",
}


class TestRuleEngine:
    def test_primary_sector_is_highest_emission_category(self):
        footprint = CarbonResponse.model_validate(SAMPLE_FOOTPRINT)
        insights = generate_rule_insights(footprint)

        assert insights.source == "rules"
        assert insights.primary_sector == "driving"
        assert len(insights.hacks) == 3
        assert insights.hacks[0].sector == "driving"

    def test_hacks_include_quantified_savings(self):
        footprint = CarbonResponse.model_validate(SAMPLE_FOOTPRINT)
        insights = generate_rule_insights(footprint)

        for hack in insights.hacks:
            assert hack.estimated_savings_kg >= 0
            assert hack.title
            assert hack.tip


class TestInsightsEndpoint:
    def test_insights_returns_rules_when_gemini_disabled(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("USE_GEMINI", "false")
        response = client.post("/api/insights", json=SAMPLE_FOOTPRINT)

        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "rules"
        assert data["primary_sector"] == "driving"
        assert len(data["hacks"]) == 3
        assert set(data.keys()) == {"source", "primary_sector", "hacks"}

    def test_insights_falls_back_when_gemini_fails(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("USE_GEMINI", "true")
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")

        with patch(
            "app.routes.insights.generate_gemini_insights",
            side_effect=RuntimeError("network throttled"),
        ):
            response = client.post("/api/insights", json=SAMPLE_FOOTPRINT)

        assert response.status_code == 200
        assert response.json()["source"] == "rules"

    def test_insights_uses_gemini_when_available(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("USE_GEMINI", "true")

        gemini_response = InsightsResponse(
            source="gemini",
            primary_sector="driving",
            hacks=[
                CarbonHack(
                    title="Hack 1",
                    tip="Tip 1",
                    estimated_savings_kg=100.0,
                    sector="driving",
                ),
                CarbonHack(
                    title="Hack 2",
                    tip="Tip 2",
                    estimated_savings_kg=80.0,
                    sector="electricity",
                ),
                CarbonHack(
                    title="Hack 3",
                    tip="Tip 3",
                    estimated_savings_kg=60.0,
                    sector="diet",
                ),
            ],
        )

        with patch(
            "app.routes.insights.generate_gemini_insights",
            return_value=gemini_response,
        ):
            response = client.post("/api/insights", json=SAMPLE_FOOTPRINT)

        assert response.status_code == 200
        assert response.json()["source"] == "gemini"

    def test_insights_rejects_invalid_payload(self):
        bad_payload = {**SAMPLE_FOOTPRINT, "total_kg_co2e": "not-a-number"}
        response = client.post("/api/insights", json=bad_payload)
        assert response.status_code == 422

    def test_insights_deterministic_rule_fallback_explicit(self):
        payload = {
            "total_kg_co2e": 5000.0,
            "breakdown": {
                "driving_kg": 3500.0, "electricity_kg": 500.0,
                "diet_kg": 800.0, "food_waste_kg": 200.0
            },
            "benchmarks": {
                "global_average_kg": 4700.0, "paris_target_kg": 2000.0,
                "difference_from_global_kg": 300.0, "difference_from_paris_kg": 3000.0,
                "percent_of_global_average": 106.38, "percent_of_paris_target": 250.0,
                "meets_paris_target": False, "below_global_average": False
            },
            "unit": "kg CO2e/year"
        }
        response = client.post("/api/insights", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "source" in data
        assert data["primary_sector"] == "driving"