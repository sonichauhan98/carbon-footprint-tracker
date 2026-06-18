import type { ApiDietType, CarbonApiRequest, CarbonApiResponse, TrackerFormValues } from "../types/carbon";

const API_BASE = "https://carbon-footprint-tracker-lzgo.onrender.com";

const WEEKS_PER_YEAR = 52;
const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = 30.437;
const DAYS_PER_WEEK = 7;
const GASOLINE_KG_PER_KM = 0.251;

const FUEL_MULTIPLIERS = {
  petrol: 1.0,
  diesel: 1.08,
  electric: 0.12,
  hybrid: 0.55,
  plug_in_hybrid: 0.35,
} as const;

const SHORT_HAUL_KM_PER_FLIGHT = 1500;
const LONG_HAUL_KM_PER_FLIGHT = 6000;
const SHORT_HAUL_KG_PER_KM = 0.155;
const LONG_HAUL_KG_PER_KM = 0.12;
const TRANSIT_KG_PER_KM = 0.05;

function mapDietToApi(diet: TrackerFormValues["dietType"]): ApiDietType {
  if (diet === "low_meat") {
    return "vegetarian";
  }
  return diet;
}

function flightEquivalentAnnualKm(
  shortHaulFlights: number,
  longHaulFlights: number,
): number {
  const flightKg =
    shortHaulFlights * SHORT_HAUL_KM_PER_FLIGHT * SHORT_HAUL_KG_PER_KM +
    longHaulFlights * LONG_HAUL_KM_PER_FLIGHT * LONG_HAUL_KG_PER_KM;
  return flightKg / GASOLINE_KG_PER_KM;
}

function transitEquivalentAnnualKm(publicTransitKmPerWeek: number): number {
  const transitKg = publicTransitKmPerWeek * WEEKS_PER_YEAR * TRANSIT_KG_PER_KM;
  return transitKg / GASOLINE_KG_PER_KM;
}

export function toApiPayload(form: TrackerFormValues): CarbonApiRequest {
  const annualCarKm = form.carDistanceKmPerWeek * WEEKS_PER_YEAR;
  const fuelAdjustedCarKm = annualCarKm * FUEL_MULTIPLIERS[form.carFuelType];
  const annualDrivingKm =
    fuelAdjustedCarKm +
    flightEquivalentAnnualKm(
      form.shortHaulFlightsPerYear,
      form.longHaulFlightsPerYear,
    ) +
    transitEquivalentAnnualKm(form.publicTransitKmPerWeek);

  const householdPeople = Math.max(form.householdPeople, 1);
  const monthlyHomeEnergyKwh = form.monthlyKwhElectricity + form.monthlyNaturalGasKwh;
  const perPersonMonthlyKwh = monthlyHomeEnergyKwh / householdPeople;

  const landfillPerDay = form.landfillWasteKgPerWeek / DAYS_PER_WEEK;
  const goodsWasteEquivalentPerDay =
    (form.goodsSpendingUsdPerMonth * 0.012) / DAYS_PER_MONTH;

  return {
    driving_km_per_day: annualDrivingKm / DAYS_PER_YEAR,
    electricity_kwh_per_day: perPersonMonthlyKwh / DAYS_PER_MONTH,
    diet_type: mapDietToApi(form.dietType),
    food_waste_kg_per_day: landfillPerDay + goodsWasteEquivalentPerDay,
  };
}

export async function calculateCarbonFootprint(
  form: TrackerFormValues,
  signal?: AbortSignal,
): Promise<CarbonApiResponse> {
  const response = await fetch(`${API_BASE}/api/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiPayload(form)),
    signal,
  });

  if (!response.ok) {
    let detail = "Unable to calculate your carbon footprint. Please try again.";
    try {
      const errorBody = (await response.json()) as { detail?: unknown };
      if (typeof errorBody.detail === "string") {
        detail = errorBody.detail;
      }
    } catch {
      // Keep default message when error body is not JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<CarbonApiResponse>;
}
