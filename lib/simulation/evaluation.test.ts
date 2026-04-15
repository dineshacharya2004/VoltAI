import { describe, expect, it } from "vitest"
import { computeAnomalyMetrics, computeForecastMetrics } from "@/lib/simulation/evaluation"

describe("evaluation metrics", () => {
  it("computes forecast MAE/RMSE/MAPE against known reference values", () => {
    const rows = [
      { predicted: 10, actual: 8 },
      { predicted: 5, actual: 5 },
      { predicted: 8, actual: 10 },
      { predicted: 6, actual: 4 },
    ]

    const metrics = computeForecastMetrics(rows)

    expect(metrics.mae).toBeCloseTo(1.5, 4)
    expect(metrics.rmse).toBeCloseTo(Math.sqrt(3), 4)
    expect(metrics.mape).toBeCloseTo(23.75, 2)
  })

  it("computes anomaly precision/recall/F1 and bounded AUROC proxy", () => {
    const rows = [
      { flagged: true, actualLabel: "spike", score: 0.95 },
      { flagged: true, actualLabel: null, score: 0.72 },
      { flagged: false, actualLabel: "drift", score: 0.31 },
      { flagged: false, actualLabel: null, score: 0.12 },
      { flagged: true, actualLabel: "outage_drop", score: 0.81 },
      { flagged: false, actualLabel: null, score: 0.08 },
    ]

    const metrics = computeAnomalyMetrics(rows)

    expect(metrics.precision).toBeCloseTo(0.6667, 3)
    expect(metrics.recall).toBeCloseTo(0.6667, 3)
    expect(metrics.f1).toBeCloseTo(0.6667, 3)
    expect(metrics.aurocProxy).toBeGreaterThanOrEqual(0)
    expect(metrics.aurocProxy).toBeLessThanOrEqual(1)
  })
})
