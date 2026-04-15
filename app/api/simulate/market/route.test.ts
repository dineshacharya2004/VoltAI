import { describe, expect, it } from "vitest"
import { GET } from "./route"

describe("GET /api/simulate/market", () => {
  it("returns a market intelligence response with trades and summary", async () => {
    const req = new Request(
      "http://localhost:3000/api/simulate/market?seed=42&months=12&scenario=normal-summer-day&strictness=balanced",
      { method: "GET" },
    )

    const response = await GET(req)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.households)).toBe(true)
    expect(Array.isArray(body.data.trades)).toBe(true)
    expect(body.data.summary.totalMatchedKwh).toBeGreaterThanOrEqual(0)
  })
})
