import { useCallback, useEffect, useRef, useState } from "react";
import { calculateCarbonFootprint } from "./api/carbon";
import { fetchCarbonInsights } from "./api/insights";
import CarbonChart from "./components/CarbonChart";
import FootprintHistoryChart from "./components/FootprintHistoryChart";
import InsightsPanel from "./components/InsightsPanel";
import TrackerForm from "./components/TrackerForm";
import { useDeviceHistory } from "./hooks/useDeviceHistory";
import type { CarbonApiResponse, InsightsApiResponse, TrackerFormValues } from "./types/carbon";

export default function App() {
  const [result, setResult] = useState<CarbonApiResponse | null>(null);
  const [insights, setInsights] = useState<InsightsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { deviceId, history, saveSnapshot } = useDeviceHistory();

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.focus();
    }
  }, [result]);

  const handleSubmit = useCallback(
    async (values: TrackerFormValues) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setInsightsLoading(true);
      setError(null);
      setInsightsError(null);

      try {
        const response = await calculateCarbonFootprint(values, controller.signal);
        setResult(response);
        saveSnapshot(response);

        try {
          const insightResponse = await fetchCarbonInsights(response, controller.signal);
          setInsights(insightResponse);
        } catch (insightErr) {
          if (insightErr instanceof DOMException && insightErr.name === "AbortError") {
            return;
          }
          const message =
            insightErr instanceof Error
              ? insightErr.message
              : "Insights are temporarily unavailable.";
          setInsights(null);
          setInsightsError(message);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
        setResult(null);
        setInsights(null);
      } finally {
        setIsLoading(false);
        setInsightsLoading(false);
      }
    },
    [saveSnapshot],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <header className="border-b border-emerald-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Carbon Footprint Awareness Platform
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
            Understand your annual carbon impact
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-emerald-900">
            Enter your lifestyle details to estimate yearly CO2 equivalent emissions,
            compare them against global benchmarks, and track anonymous history on this
            device.
          </p>
          {deviceId && (
            <p className="mt-2 text-xs text-emerald-700" aria-label="Anonymous device identifier">
              Anonymous device ID: <span className="font-mono">{deviceId}</span>
            </p>
          )}
        </div>
      </header>

      <main id="main-content" className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <TrackerForm onSubmit={handleSubmit} isLoading={isLoading} />

        <FootprintHistoryChart history={history} />

        <section aria-live="polite" aria-atomic="true" className="space-y-4">
          {isLoading && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm"
            >
              <p className="text-base font-medium text-emerald-950">
                Calculating your carbon footprint…
              </p>
              <p className="mt-2 text-sm text-emerald-800">
                This usually takes less than a second.
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div
              role="alert"
              className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-900 shadow-sm"
            >
              <h2 className="text-lg font-semibold">Calculation failed</h2>
              <p className="mt-2 text-sm leading-relaxed">{error}</p>
              <p className="mt-2 text-sm">
                Make sure the backend is running at{" "}
                <code className="rounded bg-red-100 px-1 py-0.5 text-red-950">
                  https://carbon-footprint-tracker-lzgo.onrender.com/api/calculate
                </code>
                .
              </p>
            </div>
          )}

          {!isLoading && !error && !result && (
            <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center">
              <h2 className="text-lg font-semibold text-emerald-950">
                Your results will appear here
              </h2>
              <p className="mt-2 text-sm text-emerald-800">
                Submit the form to see your emissions breakdown, AI insights, and
                benchmark comparison chart.
              </p>
            </div>
          )}

          {result && !isLoading && (
            <section
              ref={resultsRef}
              tabIndex={-1}
              aria-label="Carbon footprint calculation results"
              className="space-y-4 outline-none"
            >
              <CarbonChart data={result} />

              {insightsLoading && (
                <div role="status" className="rounded-2xl border border-emerald-200 bg-white p-6">
                  <p className="text-sm font-medium text-emerald-950">
                    Generating personalized carbon hacks…
                  </p>
                </div>
              )}

              {insightsError && !insightsLoading && (
                <div
                  role="alert"
                  className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
                >
                  <p className="text-sm">{insightsError}</p>
                </div>
              )}

              {insights && !insightsLoading && <InsightsPanel insights={insights} />}
            </section>
          )}
        </section>
      </main>

      <footer className="border-t border-emerald-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-emerald-800 sm:px-6">
          Emission factors sourced from EPA, DEFRA, and peer-reviewed research. Benchmarks:
          4,700 kg global average, 2,000 kg Paris Agreement target. History is stored
          locally and anonymously per device.
        </div>
      </footer>
    </div>
  );
}
