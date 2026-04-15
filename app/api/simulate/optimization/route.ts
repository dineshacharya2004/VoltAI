import { type NextRequest, NextResponse } from "next/server"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runOptimizationEngine } from "@/lib/simulation/phase4"
import { optimizationApiResponseSchema, scenarioProfileSchema } from "@/lib/simulation/schema"

const DEFAULT_SEED = 2026
const DEFAULT_MONTHS = 12
const DEFAULT_HORIZON = 24
const MODEL_VERSION = "sim-v4-phase4-opt"

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

    const optimization = runOptimizationEngine({
      seed,
      scenarioProfile,
      dataset,
      months,
      horizonHours,
    })

    const response = {
      success: true as const,
      traceId: `${dataset.metadata.traceId}-optimization`,
      seed,
      modelVersion: MODEL_VERSION,
      assumptions: optimization.assumptions,
      confidence: optimization.recommendations.length
        ? optimization.recommendations.reduce((sum, item) => sum + item.confidence, 0) / optimization.recommendations.length
        : 0.78,
      validationSummary: {
        schemaValid: true,
        horizonHours,
        policyId: optimization.policy.policyId,
        selectedModel: optimization.policy.selectedByModelName,
      },
      data: {
        policy: optimization.policy,
        selectedModels: optimization.selectedModels,
        allocations: optimization.allocations,
        summary: optimization.summary,
        recommendations: optimization.recommendations,
      },
    }

    const validated = optimizationApiResponseSchema.parse(response)
    return NextResponse.json(validated)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to compute optimization workflow",
      },
      { status: 400 },
    )
  }
}
