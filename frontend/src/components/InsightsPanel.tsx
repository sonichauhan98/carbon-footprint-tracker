import type { InsightsApiResponse } from "../types/carbon";

interface InsightsPanelProps {
  insights: InsightsApiResponse;
}

const SECTOR_LABELS: Record<InsightsApiResponse["primary_sector"], string> = {
  driving: "Driving",
  electricity: "Electricity",
  diet: "Diet",
  food_waste: "Food waste",
};

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <section
      aria-labelledby="insights-heading"
      className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="mb-4">
        <h2 id="insights-heading" className="text-2xl font-bold text-emerald-950">
          Personalized carbon hacks
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Top opportunity:{" "}
          <span className="font-semibold text-emerald-950">
            {SECTOR_LABELS[insights.primary_sector]}
          </span>
          . Source:{" "}
          <span className="font-semibold text-emerald-950">{insights.source}</span>
        </p>
      </header>

      <ol className="space-y-4">
        {insights.hacks.map((hack, index) => (
          <li
            key={`${hack.title}-${index}`}
            className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3"
          >
            <h3 className="text-base font-semibold text-emerald-950">
              {index + 1}. {hack.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900">{hack.tip}</p>
            <p className="mt-2 text-sm font-medium text-emerald-800">
              Estimated savings:{" "}
              <span className="tabular-nums text-emerald-950">
                {hack.estimated_savings_kg.toLocaleString()} kg CO2e/year
              </span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
