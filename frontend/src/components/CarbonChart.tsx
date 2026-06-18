import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CarbonApiResponse } from "../types/carbon";

interface CarbonChartProps {
  data: CarbonApiResponse;
}

interface ComparisonRow {
  category: string;
  emissionsKg: number;
  fill: string;
}

const BAR_COLORS = {
  user: "#047857",
  global: "#b45309",
  paris: "#1d4ed8",
} as const;

function formatKg(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg CO2e/year`;
}

export default function CarbonChart({ data }: CarbonChartProps) {
  const chartData: ComparisonRow[] = [
    {
      category: "Your total",
      emissionsKg: data.total_kg_co2e,
      fill: BAR_COLORS.user,
    },
    {
      category: "Global average",
      emissionsKg: data.benchmarks.global_average_kg,
      fill: BAR_COLORS.global,
    },
    {
      category: "Paris target",
      emissionsKg: data.benchmarks.paris_target_kg,
      fill: BAR_COLORS.paris,
    },
  ];

  const chartSummaryId = "carbon-comparison-summary";
  const dataTableId = "carbon-comparison-data-table";

  return (
    <section
      aria-labelledby="carbon-chart-heading"
      className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="mb-6">
        <h2
          id="carbon-chart-heading"
          className="text-2xl font-bold tracking-tight text-emerald-950"
        >
          Annual emissions comparison
        </h2>
        <p id={chartSummaryId} className="mt-2 text-base leading-relaxed text-emerald-900">
          Your estimated footprint is {formatKg(data.total_kg_co2e)}, which is{" "}
          {data.benchmarks.percent_of_global_average}% of the global average and{" "}
          {data.benchmarks.percent_of_paris_target}% of the Paris Agreement sustainable
          target.
        </p>
      </header>

      {/* Visual chart — hidden from assistive tech; data table below is the accessible source. */}
      <div
        aria-hidden="true"
        className="h-80 w-full rounded-lg border border-emerald-100 bg-emerald-50/40 p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#a7f3d0" />
            <XAxis
              dataKey="category"
              tick={{ fill: "#064e3b", fontSize: 12 }}
              axisLine={{ stroke: "#6ee7b7" }}
            />
            <YAxis
              tick={{ fill: "#064e3b", fontSize: 12 }}
              axisLine={{ stroke: "#6ee7b7" }}
              label={{
                value: "kg CO2e / year",
                angle: -90,
                position: "insideLeft",
                fill: "#064e3b",
                fontSize: 12,
              }}
            />
            <Tooltip
              formatter={(value: number) => [formatKg(value), "Emissions"]}
              contentStyle={{
                backgroundColor: "#ecfdf5",
                border: "1px solid #6ee7b7",
                borderRadius: "0.5rem",
                color: "#064e3b",
              }}
            />
            <Bar dataKey="emissionsKg" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible data equivalent — always available to screen readers. */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-emerald-950">
          Chart data (text equivalent)
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          The table below contains the same values shown in the bar chart above.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table
            id={dataTableId}
            className="w-full min-w-[28rem] border-collapse text-left text-sm text-emerald-950"
            aria-describedby={chartSummaryId}
          >
            <caption className="sr-only">
              Annual carbon emissions comparison between your total, the global average of
              4,700 kilograms CO2 equivalent per year, and the Paris Agreement sustainable
              target of 2,000 kilograms CO2 equivalent per year.
            </caption>
            <thead>
              <tr className="border-b-2 border-emerald-300 bg-emerald-100">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Emissions (kg CO2e/year)
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Comparison note
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-emerald-200">
                <th scope="row" className="px-4 py-3 font-medium">
                  Your total
                </th>
                <td className="px-4 py-3 tabular-nums">{data.total_kg_co2e.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {data.benchmarks.below_global_average
                    ? "Below global average"
                    : "Above global average"}
                  ;{" "}
                  {data.benchmarks.meets_paris_target
                    ? "meets Paris target"
                    : "exceeds Paris target"}
                </td>
              </tr>
              <tr className="border-b border-emerald-200">
                <th scope="row" className="px-4 py-3 font-medium">
                  Global average
                </th>
                <td className="px-4 py-3 tabular-nums">
                  {data.benchmarks.global_average_kg.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  Difference from your total:{" "}
                  {data.benchmarks.difference_from_global_kg.toLocaleString()} kg
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-medium">
                  Paris Agreement target
                </th>
                <td className="px-4 py-3 tabular-nums">
                  {data.benchmarks.paris_target_kg.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  Difference from your total:{" "}
                  {data.benchmarks.difference_from_paris_kg.toLocaleString()} kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg bg-emerald-50 px-4 py-3">
          <h4 className="text-sm font-semibold text-emerald-950">Driving</h4>
          <p className="mt-1 tabular-nums text-emerald-900">
            {formatKg(data.breakdown.driving_kg)}
          </p>
        </article>
        <article className="rounded-lg bg-emerald-50 px-4 py-3">
          <h4 className="text-sm font-semibold text-emerald-950">Electricity</h4>
          <p className="mt-1 tabular-nums text-emerald-900">
            {formatKg(data.breakdown.electricity_kg)}
          </p>
        </article>
        <article className="rounded-lg bg-emerald-50 px-4 py-3">
          <h4 className="text-sm font-semibold text-emerald-950">Diet</h4>
          <p className="mt-1 tabular-nums text-emerald-900">
            {formatKg(data.breakdown.diet_kg)}
          </p>
        </article>
        <article className="rounded-lg bg-emerald-50 px-4 py-3">
          <h4 className="text-sm font-semibold text-emerald-950">Food waste</h4>
          <p className="mt-1 tabular-nums text-emerald-900">
            {formatKg(data.breakdown.food_waste_kg)}
          </p>
        </article>
      </div>
    </section>
  );
}
