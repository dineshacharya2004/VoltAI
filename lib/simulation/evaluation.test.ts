import { describe, expect, it } from "vitest"
import { computeAnomalyMetrics, computeForecastMetrics, runEvaluationWorkflow } from "@/lib/simulation/evaluation"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"

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

  it("reports hybrid-vs-traditional comparison with improvement fields", () => {
    const dataset = generateSyntheticDataset({
      seed: 2026,
      months: 12,
      scenarioProfile: "normal-summer-day",
      startDateIso: "2025-01-01T00:00:00.000Z",
    })

    const output = runEvaluationWorkflow({
      seed: 2026,
      scenarioProfile: "normal-summer-day",
      dataset,
      horizonHours: 24,
      sortBy: "score",
      ablation: {
        withoutWeather: false,
        withoutTemporal: false,
        withoutOccupancy: false,
      },
    })

    expect(output.comparison.forecast.length).toBeGreaterThan(0)
    expect(output.comparison.anomaly.length).toBeGreaterThan(0)

    for (const comparison of output.comparison.forecast) {
      expect(comparison.hybridModelId.includes("hybrid") || comparison.hybridModelId.includes("stage2")).toBe(true)
      expect(Number.isFinite(comparison.improvementPctVsBestBaseline.rmse)).toBe(true)
      expect(Number.isFinite(comparison.improvementPctVsAverageBaseline.mae)).toBe(true)
    }

    const anomalyComparison = output.comparison.anomaly[0]
    expect(anomalyComparison.hybridModelId.includes("fused")).toBe(true)
    expect(Number.isFinite(anomalyComparison.improvementPctVsBestBaseline.f1)).toBe(true)
  })
})
