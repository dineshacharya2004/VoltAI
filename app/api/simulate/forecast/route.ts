import { type NextRequest, NextResponse } from "next/server"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runModelSimulationSuite } from "@/lib/simulation/model-simulators"
import { forecastApiResponseSchema, scenarioProfileSchema } from "@/lib/simulation/schema"
import type { WeatherProviderId } from "@/lib/simulation/weather-adapter"

const DEFAULT_SEED = 2026
const DEFAULT_MONTHS = 12
const DEFAULT_HORIZON = 24
const MODEL_VERSION = "sim-v2-phase2"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const seedParam = Number.parseInt(searchParams.get("seed") ?? `${DEFAULT_SEED}`, 10)
    const monthsParam = Number.parseInt(searchParams.get("months") ?? `${DEFAULT_MONTHS}`, 10)
    const horizonParam = Number.parseInt(searchParams.get("horizonHours") ?? `${DEFAULT_HORIZON}`, 10)
    const scenarioParam = searchParams.get("scenario") ?? "normal-summer-day"
    const weatherProviderParam = searchParams.get("weatherProvider") ?? "synthetic"

    const seed = Number.isFinite(seedParam) ? seedParam : DEFAULT_SEED
    const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(12, monthsParam)) : DEFAULT_MONTHS
    const horizonHours = Number.isFinite(horizonParam) ? Math.min(72, Math.max(24, horizonParam)) : DEFAULT_HORIZON
    const scenarioProfile = scenarioProfileSchema.parse(scenarioParam)
    const weatherProvider: WeatherProviderId = weatherProviderParam === "open-meteo-sim" ? "open-meteo-sim" : "synthetic"

    const dataset = generateSyntheticDataset({
      seed,
      months,
      scenarioProfile,
    })

    const bundle = runModelSimulationSuite({
      seed,
      scenarioProfile,
      dataset,
      horizonHours,
      weatherProvider,
    })

    const response = {
      success: true as const,
      traceId: `${dataset.metadata.traceId}-forecast`,
      seed,
      modelVersion: MODEL_VERSION,
      assumptions: [
        "All models are deterministic simulation proxies and are not trained on private data.",
        "Weather ingestion uses pluggable adapter contracts; current providers are synthetic and API-style simulated feeds.",
        "Confidence intervals widen with scenario-derived volatility.",
      ],
      confidence: 0.9,
      validationSummary: {
        schemaValid: true,
        horizonHours,
        weatherProvider: bundle.weatherSource.provider,
        demandModelCount: bundle.demandModels.length,
        solarModelCount: bundle.solarModels.length,
        anomalyModelCount: bundle.anomalyModels.length,
      },
      data: {
        metadata: dataset.metadata,
        weatherSource: bundle.weatherSource,
        demandModels: bundle.demandModels,
        solarModels: bundle.solarModels,
        anomalyModels: bundle.anomalyModels,
        sufficiency: bundle.sufficiency,
      },
    }

    const validated = forecastApiResponseSchema.parse(response)
    return NextResponse.json(validated)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate forecast simulation payload",
      },
      { status: 400 },
    )
  }
}
