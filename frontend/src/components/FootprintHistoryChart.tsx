import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryEntry } from "../hooks/useDeviceHistory";

interface FootprintHistoryChartProps {
  history: HistoryEntry[];
}

function formatDateLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FootprintHistoryChart({ history }: FootprintHistoryChartProps) {
  if (history.length < 2) {
    return (
      <section className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-950">Footprint history</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Submit at least two calculations to see your trend line.
        </p>
      </section>
    );
  }

  const chartData = history.map((entry, index) => ({
    label: formatDateLabel(entry.recordedAt),
    entryNumber: index + 1,
    totalKg: entry.totalKgCo2e,
  }));

  return (
    <section
      aria-labelledby="history-chart-heading"
      className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="mb-4">
        <h2 id="history-chart-heading" className="text-2xl font-bold text-emerald-950">
          Footprint history
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Anonymous trend for this device across {history.length} saved entries.
        </p>
      </header>

      <div
        aria-hidden="true"
        className="h-72 w-full rounded-lg border border-emerald-100 bg-emerald-50/40 p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#a7f3d0" />
            <XAxis
              dataKey="entryNumber"
              tick={{ fill: "#064e3b", fontSize: 12 }}
              label={{
                value: "Entry #",
                position: "insideBottom",
                offset: -4,
                fill: "#064e3b",
              }}
            />
            <YAxis
              tick={{ fill: "#064e3b", fontSize: 12 }}
              label={{
                value: "kg CO2e/year",
                angle: -90,
                position: "insideLeft",
                fill: "#064e3b",
                fontSize: 12,
              }}
            />
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString()} kg CO2e/year`,
                "Total footprint",
              ]}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as { label: string } | undefined;
                return point?.label ?? "Entry";
              }}
            />
            <Line
              type="monotone"
              dataKey="totalKg"
              stroke="#047857"
              strokeWidth={3}
              dot={{ r: 4, fill: "#047857" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[24rem] border-collapse text-left text-sm text-emerald-950">
          <caption className="sr-only">
            Historical carbon footprint totals saved for this anonymous device.
          </caption>
          <thead>
            <tr className="border-b-2 border-emerald-300 bg-emerald-100">
              <th scope="col" className="px-4 py-3 font-semibold">
                Entry
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Recorded at
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Total (kg CO2e/year)
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, index) => (
              <tr key={entry.id} className="border-b border-emerald-200">
                <th scope="row" className="px-4 py-3 font-medium">
                  #{index + 1}
                </th>
                <td className="px-4 py-3">{formatDateLabel(entry.recordedAt)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {entry.totalKgCo2e.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
