import { type NextRequest, NextResponse } from "next/server"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { datasetApiResponseSchema, scenarioProfileSchema } from "@/lib/simulation/schema"

const DEFAULT_SEED = 2026
const DEFAULT_MONTHS = 12
const MODEL_VERSION = "sim-v1-phase1"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const seedParam = Number.parseInt(searchParams.get("seed") ?? `${DEFAULT_SEED}`, 10)
    const monthsParam = Number.parseInt(searchParams.get("months") ?? `${DEFAULT_MONTHS}`, 10)
    const scenarioParam = searchParams.get("scenario") ?? "normal-summer-day"

    const seed = Number.isFinite(seedParam) ? seedParam : DEFAULT_SEED
    const months = Number.isFinite(monthsParam) ? Math.min(24, Math.max(12, monthsParam)) : DEFAULT_MONTHS
    const scenarioProfile = scenarioProfileSchema.parse(scenarioParam)

    const dataset = generateSyntheticDataset({
      seed,
      months,
      scenarioProfile,
    })

    const anomalyCount = dataset.data.filter((point) => point.anomalyLabel !== null).length
    const response = {
      success: true as const,
      traceId: dataset.metadata.traceId,
      seed: dataset.metadata.seed,
      modelVersion: MODEL_VERSION,
      assumptions: dataset.metadata.assumptions,
      confidence: 0.88,
      validationSummary: {
        schemaValid: true,
        hoursGenerated: dataset.data.length,
        anomalyCount,
      },
      data: dataset,
    }

    const validated = datasetApiResponseSchema.parse(response)

    return NextResponse.json(validated)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate synthetic dataset",
      },
      { status: 400 },
    )
  }
}
