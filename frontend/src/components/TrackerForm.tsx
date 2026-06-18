import { useId, useState } from "react";
import type { CarFuelType, FormDietType, TrackerFormValues } from "../types/carbon";

interface TrackerFormProps {
  onSubmit: (values: TrackerFormValues) => void;
  isLoading: boolean;
}

const FUEL_OPTIONS: { value: CarFuelType; label: string }[] = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
  { value: "plug_in_hybrid", label: "Plug-in hybrid" },
];

const DIET_OPTIONS: { value: FormDietType; label: string }[] = [
  { value: "heavy_meat", label: "Heavy meat" },
  { value: "low_meat", label: "Low meat" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
];

const DEFAULT_VALUES: TrackerFormValues = {
  carDistanceKmPerWeek: 150,
  carFuelType: "petrol",
  publicTransitKmPerWeek: 20,
  shortHaulFlightsPerYear: 1,
  longHaulFlightsPerYear: 0,
  monthlyKwhElectricity: 300,
  monthlyNaturalGasKwh: 100,
  householdPeople: 2,
  dietType: "vegetarian",
  goodsSpendingUsdPerMonth: 200,
  landfillWasteKgPerWeek: 2,
};

const INPUT_CLASS =
  "mt-2 w-full rounded-lg border border-emerald-300 bg-white px-4 py-3 text-base text-emerald-950 placeholder:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

const LABEL_CLASS = "block text-sm font-semibold text-emerald-950";

const HINT_CLASS = "mt-1 text-sm text-emerald-800";

const FIELDSET_CLASS =
  "space-y-5 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6";

const LEGEND_CLASS = "px-1 text-lg font-bold text-emerald-950";

const NUMERIC_FIELDS: (keyof TrackerFormValues)[] = [
  "carDistanceKmPerWeek",
  "publicTransitKmPerWeek",
  "shortHaulFlightsPerYear",
  "longHaulFlightsPerYear",
  "monthlyKwhElectricity",
  "monthlyNaturalGasKwh",
  "householdPeople",
  "goodsSpendingUsdPerMonth",
  "landfillWasteKgPerWeek",
];

export default function TrackerForm({ onSubmit, isLoading }: TrackerFormProps) {
  const formId = useId();
  const [values, setValues] = useState<TrackerFormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof TrackerFormValues, string>>>({});

  const errorSummaryId = `${formId}-error-summary`;

  const validate = (next: TrackerFormValues): boolean => {
    const nextErrors: Partial<Record<keyof TrackerFormValues, string>> = {};

    for (const field of NUMERIC_FIELDS) {
      const value = next[field];
      if (typeof value === "number" && value < 0) {
        nextErrors[field] = "Value cannot be negative.";
      }
    }

    if (next.householdPeople < 1) {
      nextErrors.householdPeople = "Household must include at least one person.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validate(values)) {
      onSubmit(values);
    }
  };

  const updateNumber = (field: keyof TrackerFormValues, raw: string) => {
    const parsed = raw === "" ? 0 : Number(raw);
    setValues((prev) => ({ ...prev, [field]: Number.isNaN(parsed) ? 0 : parsed }));
  };

  const hasErrors = Object.keys(errors).length > 0;

  const renderNumberField = (
    field: keyof TrackerFormValues,
    label: string,
    hint: string,
    options?: { step?: number; min?: number },
  ) => {
    const hintId = `${formId}-${String(field)}-hint`;
    const value = values[field];
    return (
      <div key={String(field)}>
        <label htmlFor={`${formId}-${String(field)}`} className={LABEL_CLASS}>
          {label}
        </label>
        <p id={hintId} className={HINT_CLASS}>
          {hint}
        </p>
        <input
          id={`${formId}-${String(field)}`}
          name={String(field)}
          type="number"
          inputMode="decimal"
          min={options?.min ?? 0}
          step={options?.step ?? 1}
          required
          aria-describedby={hintId}
          aria-invalid={Boolean(errors[field])}
          value={typeof value === "number" ? value : 0}
          onChange={(e) => updateNumber(field, e.target.value)}
          className={INPUT_CLASS}
        />
        {errors[field] && (
          <p className="mt-1 text-sm font-medium text-red-800" role="alert">
            {errors[field]}
          </p>
        )}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={`${formId}-title`}
      aria-describedby={hasErrors ? errorSummaryId : undefined}
      className="mx-auto w-full max-w-3xl rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="mb-8">
        <h2
          id={`${formId}-title`}
          className="text-2xl font-bold tracking-tight text-emerald-950"
        >
          Your lifestyle inputs
        </h2>
        <p className="mt-2 text-base leading-relaxed text-emerald-900">
          Enter your typical habits below. All fields stack in a single column and support
          full keyboard navigation.
        </p>
      </header>

      {hasErrors && (
        <div
          id={errorSummaryId}
          role="alert"
          className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900"
        >
          <p className="font-semibold">Please fix the following issues:</p>
          <ul className="mt-2 list-inside list-disc text-sm">
            {Object.values(errors).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <fieldset className={FIELDSET_CLASS}>
          <legend className={LEGEND_CLASS}>Transport</legend>

          {renderNumberField(
            "carDistanceKmPerWeek",
            "Car distance per week (km)",
            "Your typical weekly distance in a personal car. Annual driving is calculated as weekly km × 52.",
          )}

          <div>
            <label htmlFor={`${formId}-car-fuel`} className={LABEL_CLASS}>
              Car fuel type
            </label>
            <p id={`${formId}-car-fuel-hint`} className={HINT_CLASS}>
              Select the fuel type that best matches your primary vehicle.
            </p>
            <select
              id={`${formId}-car-fuel`}
              name="carFuelType"
              required
              aria-describedby={`${formId}-car-fuel-hint`}
              value={values.carFuelType}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  carFuelType: e.target.value as CarFuelType,
                }))
              }
              className={INPUT_CLASS}
            >
              {FUEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {renderNumberField(
            "publicTransitKmPerWeek",
            "Public transit per week (km)",
            "Weekly distance on buses, trains, or metro.",
          )}

          {renderNumberField(
            "shortHaulFlightsPerYear",
            "Short-haul flights per year",
            "Flights under roughly 3 hours each way (e.g., domestic or regional).",
            { step: 1 },
          )}

          {renderNumberField(
            "longHaulFlightsPerYear",
            "Long-haul flights per year",
            "Flights over roughly 3 hours each way (e.g., international).",
            { step: 1 },
          )}
        </fieldset>

        <fieldset className={FIELDSET_CLASS}>
          <legend className={LEGEND_CLASS}>Home energy</legend>

          {renderNumberField(
            "monthlyKwhElectricity",
            "Electricity per month (kWh)",
            "Average monthly household electricity from your utility bill.",
            { step: 0.1 },
          )}

          {renderNumberField(
            "monthlyNaturalGasKwh",
            "Natural gas per month (kWh)",
            "Convert your gas bill to kWh if needed, or enter your best estimate.",
            { step: 0.1 },
          )}

          {renderNumberField(
            "householdPeople",
            "People in household",
            "Home energy is shared across this many people.",
            { min: 1, step: 1 },
          )}
        </fieldset>

        <fieldset className={FIELDSET_CLASS}>
          <legend className={LEGEND_CLASS}>Diet &amp; consumption</legend>

          <div>
            <label htmlFor={`${formId}-diet`} className={LABEL_CLASS}>
              Diet
            </label>
            <p id={`${formId}-diet-hint`} className={HINT_CLASS}>
              Choose the dietary pattern that best matches your typical meals.
            </p>
            <select
              id={`${formId}-diet`}
              name="dietType"
              required
              aria-describedby={`${formId}-diet-hint`}
              value={values.dietType}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  dietType: e.target.value as FormDietType,
                }))
              }
              className={INPUT_CLASS}
            >
              {DIET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {renderNumberField(
            "goodsSpendingUsdPerMonth",
            "Goods spending per month (USD)",
            "Typical monthly spend on clothing, electronics, and other consumer goods.",
            { step: 1 },
          )}

          {renderNumberField(
            "landfillWasteKgPerWeek",
            "Landfill waste per week (kg)",
            "Non-recycled waste sent to landfill each week, in kilograms.",
            { step: 0.1 },
          )}
        </fieldset>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
        className="mt-8 w-full rounded-lg bg-emerald-800 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        {isLoading ? "Calculating footprint…" : "Calculate my carbon footprint"}
      </button>
    </form>
  );
}
