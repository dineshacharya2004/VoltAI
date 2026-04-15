import { describe, expect, it } from "vitest"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runMarketIntelligence, runOptimizationEngine } from "@/lib/simulation/phase4"

describe("phase4 optimization and market intelligence", () => {
  it("produces deterministic optimization outputs from fixed seed and inputs", () => {
    const dataset = generateSyntheticDataset({
      seed: 42,
      months: 12,
      scenarioProfile: "normal-summer-day",
      startDateIso: "2025-01-01T00:00:00.000Z",
    })

    const first = runOptimizationEngine({
      seed: 42,
      scenarioProfile: "normal-summer-day",
      dataset,
      months: 12,
      horizonHours: 24,
    })

    const second = runOptimizationEngine({
      seed: 42,
      scenarioProfile: "normal-summer-day",
      dataset,
      months: 12,
      horizonHours: 24,
    })

    expect(first).toEqual(second)
    expect(first.policy.selectedByModelId.length).toBeGreaterThan(0)
    expect(first.selectedModels.anomalyModel.length).toBeGreaterThan(0)
    expect(first.summary.safetyFallbackHours).toBeGreaterThanOrEqual(0)
    expect(first.allocations.every((row) => row.forecastUncertainty >= 0)).toBe(true)
    expect(first.allocations.every((row) => row.anomalyConfidence >= 0)).toBe(true)
    expect(first.allocations.some((row) => row.safetyFallback)).toBe(true)
  })

  it("market intelligence demonstrates dual-role households and constraint-consistent trades", () => {
    const output = runMarketIntelligence({
      seed: 42,
      scenarioProfile: "normal-summer-day",
      months: 12,
      horizonHours: 24,
    })

    const dualRole = output.households.filter((row) => row.dualRole)
    expect(dualRole.length).toBeGreaterThan(0)

    for (const trade of output.trades) {
      expect(trade.quantityKwh).toBeGreaterThan(0)
      expect(trade.sellerId).not.toBe(trade.buyerId)
      expect(trade.clearingPriceInrPerKwh).toBeGreaterThan(0)
      expect(trade.distanceKm).toBeGreaterThanOrEqual(0)
    }
  })
})
