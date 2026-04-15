import { describe, expect, it } from "vitest"
import { GET } from "./route"

describe("GET /api/simulate/optimization", () => {
  it("returns a schema-valid optimization response", async () => {
    const req = new Request(
      "http://localhost:3000/api/simulate/optimization?seed=42&months=12&scenario=normal-summer-day",
      { method: "GET" },
    )

    const response = await GET(req)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data.policy.selectedByModelId).toBeTypeOf("string")
    expect(body.data.allocations).toHaveLength(24)
  })
})
