import { describe, expect, it } from "vitest"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runModelSimulationSuite } from "@/lib/simulation/model-simulators"

describe("runModelSimulationSuite", () => {
  it("returns required side-by-side model counts with confidence, latency, and explainability", () => {
    const dataset = generateSyntheticDataset({
      seed: 2026,
      months: 12,
      scenarioProfile: "normal-summer-day",
      startDateIso: "2025-01-01T00:00:00.000Z",
    })

    const output = runModelSimulationSuite({
      seed: 2026,
      scenarioProfile: "normal-summer-day",
      dataset,
      horizonHours: 24,
    })

    expect(output.demandModels).toHaveLength(3)
    expect(output.solarModels).toHaveLength(2)
    expect(output.anomalyModels).toHaveLength(2)

    for (const model of [...output.demandModels, ...output.solarModels]) {
      expect(model.confidence).toBeGreaterThan(0)
      expect(model.latencyMs).toBeGreaterThan(0)
      expect(model.explainability.topFactors.length).toBeGreaterThan(0)
      expect(model.predictions.length).toBe(24)
    }

    for (const model of output.anomalyModels) {
      expect(model.confidence).toBeGreaterThan(0)
      expect(model.latencyMs).toBeGreaterThan(0)
      expect(model.explainability.topFactors.length).toBeGreaterThan(0)
      expect(model.scores.length).toBe(24)
    }
  })

  it("is deterministic for fixed seed/scenario inputs", () => {
    const dataset = generateSyntheticDataset({
      seed: 19,
      months: 12,
      scenarioProfile: "festival-high-demand",
      startDateIso: "2025-01-01T00:00:00.000Z",
    })

    const first = runModelSimulationSuite({
      seed: 19,
      scenarioProfile: "festival-high-demand",
      dataset,
      horizonHours: 24,
    })

    const second = runModelSimulationSuite({
      seed: 19,
      scenarioProfile: "festival-high-demand",
      dataset,
      horizonHours: 24,
    })

    expect(first).toEqual(second)
  })
})
