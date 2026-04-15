import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { GET as getDataset } from "@/app/api/simulate/dataset/route"
import { GET as getForecast } from "@/app/api/simulate/forecast/route"
import { GET as getEvaluation } from "@/app/api/simulate/evaluation/route"
import { GET as getOptimization } from "@/app/api/simulate/optimization/route"
import { GET as getMarket } from "@/app/api/simulate/market/route"

describe("simulate API contract parity", () => {
  it("includes required traceability fields across all phase endpoints", async () => {
    const commonQuery = "seed=2042&months=12&scenario=festival-high-demand&horizonHours=24"

    const requests = [
      ["dataset", await getDataset(new NextRequest(`http://localhost:3000/api/simulate/dataset?seed=2042&months=12&scenario=festival-high-demand`))],
      ["forecast", await getForecast(new NextRequest(`http://localhost:3000/api/simulate/forecast?${commonQuery}&weatherProvider=synthetic`))],
      ["evaluation", await getEvaluation(new NextRequest(`http://localhost:3000/api/simulate/evaluation?${commonQuery}&sortBy=score`))],
      ["optimization", await getOptimization(new NextRequest(`http://localhost:3000/api/simulate/optimization?${commonQuery}`))],
      ["market", await getMarket(new NextRequest(`http://localhost:3000/api/simulate/market?${commonQuery}`))],
    ] as const

    for (const [name, response] of requests) {
      expect(response.status, `${name} status`).toBe(200)
      const json = await response.json()

      expect(typeof json.traceId, `${name} traceId`).toBe("string")
      expect(json.traceId.length, `${name} traceId length`).toBeGreaterThan(0)
      expect(typeof json.seed, `${name} seed`).toBe("number")
      expect(typeof json.modelVersion, `${name} modelVersion`).toBe("string")
      expect(Array.isArray(json.assumptions), `${name} assumptions`).toBe(true)
      expect(typeof json.confidence, `${name} confidence`).toBe("number")
      expect(typeof json.validationSummary, `${name} validationSummary`).toBe("object")
      expect(json.success, `${name} success`).toBe(true)
    }
  })
})
