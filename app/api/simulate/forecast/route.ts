import { type NextRequest, NextResponse } from "next/server"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runModelSimulationSuite } from "@/lib/simulation/model-simulators"
import { forecastApiResponseSchema, scenarioProfileSchema } from "@/lib/simulation/schema"

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

    const seed = Number.isFinite(seedParam) ? seedParam : DEFAULT_SEED
    const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(12, monthsParam)) : DEFAULT_MONTHS
    const horizonHours = Number.isFinite(horizonParam) ? Math.min(72, Math.max(24, horizonParam)) : DEFAULT_HORIZON
    const scenarioProfile = scenarioProfileSchema.parse(scenarioParam)

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
    })

    const response = {
      success: true as const,
      traceId: `${dataset.metadata.traceId}-forecast`,
      seed,
      modelVersion: MODEL_VERSION,
      assumptions: [
        "All models are deterministic simulation proxies and are not trained on private data.",
        "Confidence intervals widen with scenario-derived volatility.",
      ],
      confidence: 0.9,
      validationSummary: {
        schemaValid: true,
        horizonHours,
        demandModelCount: bundle.demandModels.length,
        solarModelCount: bundle.solarModels.length,
        anomalyModelCount: bundle.anomalyModels.length,
      },
      data: {
        metadata: dataset.metadata,
        demandModels: bundle.demandModels,
        solarModels: bundle.solarModels,
        anomalyModels: bundle.anomalyModels,
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
