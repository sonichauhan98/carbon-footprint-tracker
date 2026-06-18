export type ApiDietType = "heavy_meat" | "vegetarian" | "vegan";

export type FormDietType = "heavy_meat" | "low_meat" | "vegetarian" | "vegan";

export type CarFuelType =
  | "petrol"
  | "diesel"
  | "electric"
  | "hybrid"
  | "plug_in_hybrid";

/** User-friendly form values grouped by lifestyle category. */
export interface TrackerFormValues {
  // Transport
  carDistanceKmPerWeek: number;
  carFuelType: CarFuelType;
  publicTransitKmPerWeek: number;
  shortHaulFlightsPerYear: number;
  longHaulFlightsPerYear: number;
  // Home energy
  monthlyKwhElectricity: number;
  monthlyNaturalGasKwh: number;
  householdPeople: number;
  // Diet & consumption
  dietType: FormDietType;
  goodsSpendingUsdPerMonth: number;
  landfillWasteKgPerWeek: number;
}

/** Payload sent to POST /api/calculate (daily units). */
export interface CarbonApiRequest {
  driving_km_per_day: number;
  electricity_kwh_per_day: number;
  diet_type: ApiDietType;
  food_waste_kg_per_day: number;
}

export interface CategoryBreakdown {
  driving_kg: number;
  electricity_kg: number;
  diet_kg: number;
  food_waste_kg: number;
}

export interface BenchmarkComparison {
  global_average_kg: number;
  paris_target_kg: number;
  difference_from_global_kg: number;
  difference_from_paris_kg: number;
  percent_of_global_average: number;
  percent_of_paris_target: number;
  meets_paris_target: boolean;
  below_global_average: boolean;
}

export interface CarbonApiResponse {
  total_kg_co2e: number;
  breakdown: CategoryBreakdown;
  benchmarks: BenchmarkComparison;
  unit: "kg CO2e/year";
}

export type InsightSector = "driving" | "electricity" | "diet" | "food_waste";

export interface CarbonHack {
  title: string;
  tip: string;
  estimated_savings_kg: number;
  sector: InsightSector;
}

export interface InsightsApiResponse {
  source: "gemini" | "rules";
  primary_sector: InsightSector;
  hacks: CarbonHack[];
}
