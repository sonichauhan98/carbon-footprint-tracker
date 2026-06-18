import type { CarbonApiResponse, InsightsApiResponse } from "../types/carbon";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchCarbonInsights(
  footprint: CarbonApiResponse,
  signal?: AbortSignal,
): Promise<InsightsApiResponse> {
  const response = await fetch(`${API_BASE}/api/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(footprint),
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load personalized carbon insights.");
  }

  return response.json() as Promise<InsightsApiResponse>;
}
