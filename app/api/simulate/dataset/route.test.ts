import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/simulate/dataset/route"
import { datasetApiResponseSchema } from "@/lib/simulation/schema"

describe("GET /api/simulate/dataset", () => {
  it("returns a schema-valid deterministic payload with traceability fields", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/simulate/dataset?seed=42&months=12&scenario=normal-summer-day",
    )

    const response = await GET(request)
    const json = await response.json()

    expect(response.status).toBe(200)

    const parsed = datasetApiResponseSchema.safeParse(json)
    expect(parsed.success).toBe(true)

    expect(json.traceId).toContain("trace-normal-summer-day-12m-42")
    expect(json.seed).toBe(42)
    expect(json.validationSummary.schemaValid).toBe(true)
  })
})
