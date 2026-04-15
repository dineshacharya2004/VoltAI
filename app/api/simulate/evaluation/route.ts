import { type NextRequest, NextResponse } from "next/server"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runEvaluationWorkflow } from "@/lib/simulation/evaluation"
import { evaluationApiResponseSchema, scenarioProfileSchema } from "@/lib/simulation/schema"

const DEFAULT_SEED = 2026
const DEFAULT_MONTHS = 12
const DEFAULT_HORIZON = 24
const MODEL_VERSION = "sim-v3-phase3"

function parseBoolean(value: string | null) {
  return value === "1" || value === "true"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const seedParam = Number.parseInt(searchParams.get("seed") ?? `${DEFAULT_SEED}`, 10)
    const monthsParam = Number.parseInt(searchParams.get("months") ?? `${DEFAULT_MONTHS}`, 10)
    const horizonParam = Number.parseInt(searchParams.get("horizonHours") ?? `${DEFAULT_HORIZON}`, 10)
    const scenarioParam = searchParams.get("scenario") ?? "normal-summer-day"
    const sortByParam = searchParams.get("sortBy") ?? "score"

    const seed = Number.isFinite(seedParam) ? seedParam : DEFAULT_SEED
    const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(12, monthsParam)) : DEFAULT_MONTHS
    const horizonHours = Number.isFinite(horizonParam) ? Math.min(72, Math.max(24, horizonParam)) : DEFAULT_HORIZON
    const scenarioProfile = scenarioProfileSchema.parse(scenarioParam)
    const sortBy = ["mae", "rmse", "mape", "score"].includes(sortByParam) ? (sortByParam as "mae" | "rmse" | "mape" | "score") : "score"

    const ablation = {
      withoutWeather: parseBoolean(searchParams.get("withoutWeather")),
      withoutTemporal: parseBoolean(searchParams.get("withoutTemporal")),
      withoutOccupancy: parseBoolean(searchParams.get("withoutOccupancy")),
    }

    const dataset = generateSyntheticDataset({
      seed,
      months,
      scenarioProfile,
    })

    const evaluation = runEvaluationWorkflow({
      seed,
      scenarioProfile,
      dataset,
      horizonHours,
      sortBy,
      ablation,
    })

    const response = {
      success: true as const,
      traceId: `${dataset.metadata.traceId}-evaluation`,
      seed,
      modelVersion: MODEL_VERSION,
      assumptions: [
        "Metrics are computed on deterministic holdout windows from synthetic data.",
        "Ablation effects are deterministic degradations used for comparative validation.",
      ],
      confidence: 0.91,
      validationSummary: {
        schemaValid: true,
        horizonHours,
        sortBy,
        ablation,
      },
      data: {
        forecastLeaderboard: evaluation.forecastLeaderboard,
        anomalyLeaderboard: evaluation.anomalyLeaderboard,
        calibrationBuckets: evaluation.calibration,
        stressTestSummary: evaluation.stressTestSummary,
        ablationDeltas: evaluation.ablationDeltas,
        comparison: evaluation.comparison,
      },
    }

    const validated = evaluationApiResponseSchema.parse(response)
    return NextResponse.json(validated)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to compute evaluation workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    )
  }
}
