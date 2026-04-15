import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/simulate/forecast/route"
import { forecastApiResponseSchema } from "@/lib/simulation/schema"

describe("GET /api/simulate/forecast", () => {
  it("returns schema-valid payload with side-by-side model outputs", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/simulate/forecast?seed=42&months=12&horizonHours=24&scenario=normal-summer-day&weatherProvider=synthetic",
    )

    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)

    const parsed = forecastApiResponseSchema.safeParse(json)
    expect(parsed.success).toBe(true)

    expect(json.validationSummary.demandModelCount).toBe(5)
    expect(json.validationSummary.solarModelCount).toBe(3)
    expect(json.validationSummary.anomalyModelCount).toBe(3)
    expect(json.validationSummary.weatherProvider).toBe("synthetic")
    expect(json.data.sufficiency.hourly).toHaveLength(24)
    expect(json.data.weatherSource.provider).toBe("synthetic")
  })
})
