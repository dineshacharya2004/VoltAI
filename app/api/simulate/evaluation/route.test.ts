import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/simulate/evaluation/route"
import { evaluationApiResponseSchema } from "@/lib/simulation/schema"

describe("GET /api/simulate/evaluation", () => {
  it("returns schema-valid evaluation payload with leaderboard and ablation metrics", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/simulate/evaluation?seed=42&months=12&horizonHours=24&scenario=normal-summer-day&sortBy=score&withoutWeather=true",
    )

    const response = await GET(request)
    const json = await response.json()

    expect(response.status, JSON.stringify(json)).toBe(200)

    const parsed = evaluationApiResponseSchema.safeParse(json)
    expect(parsed.success).toBe(true)
    expect(json.data.forecastLeaderboard.length).toBeGreaterThanOrEqual(5)
    expect(json.data.anomalyLeaderboard.length).toBe(3)
    expect(json.data.comparison.forecast.length).toBeGreaterThan(0)
    expect(json.data.comparison.anomaly.length).toBeGreaterThan(0)
    expect(json.data.calibrationBuckets.length).toBeGreaterThan(0)
  })
})
