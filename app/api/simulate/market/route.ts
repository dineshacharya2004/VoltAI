import { type NextRequest, NextResponse } from "next/server"
import { runMarketIntelligence } from "@/lib/simulation/phase4"
import { marketApiResponseSchema, scenarioProfileSchema } from "@/lib/simulation/schema"

const DEFAULT_SEED = 2026
const DEFAULT_MONTHS = 12
const DEFAULT_HORIZON = 24
const MODEL_VERSION = "sim-v4-phase4-market"

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

    const market = runMarketIntelligence({
      seed,
      scenarioProfile,
      months,
      horizonHours,
    })

    const response = {
      success: true as const,
      traceId: `trace-${scenarioProfile}-${months}m-${seed}-market`,
      seed,
      modelVersion: MODEL_VERSION,
      assumptions: market.assumptions,
      confidence: market.summary.marketConfidence,
      validationSummary: {
        schemaValid: true,
        horizonHours,
        strictness: market.policySignal.strictness,
        dualRoleHouseholds: market.summary.dualRoleHouseholds,
      },
      data: market,
    }

    const validated = marketApiResponseSchema.parse(response)
    return NextResponse.json(validated)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to compute market intelligence workflow",
      },
      { status: 400 },
    )
  }
}
