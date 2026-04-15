import { describe, expect, it } from "vitest"
import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { listScenarioProfiles } from "@/lib/simulation/scenarios"
import { syntheticDatasetSchema } from "@/lib/simulation/schema"

describe("generateSyntheticDataset", () => {
  it("is deterministic for the same seed/scenario/months", () => {
    const first = generateSyntheticDataset({
      seed: 2026,
      months: 12,
      scenarioProfile: "normal-summer-day",
      startDateIso: "2025-01-01T00:00:00.000Z",
    })

    const second = generateSyntheticDataset({
      seed: 2026,
      months: 12,
      scenarioProfile: "normal-summer-day",
      startDateIso: "2025-01-01T00:00:00.000Z",
    })

    expect(first.data).toEqual(second.data)
    expect(first.metadata.traceId).toEqual(second.metadata.traceId)
    expect(first.metadata.seed).toEqual(second.metadata.seed)
  })

  it("returns schema-valid datasets for all phase-1 scenarios", () => {
    for (const scenarioProfile of listScenarioProfiles()) {
      const dataset = generateSyntheticDataset({
        seed: 17,
        months: 12,
        scenarioProfile,
        startDateIso: "2025-01-01T00:00:00.000Z",
      })

      const parsed = syntheticDatasetSchema.safeParse(dataset)
      expect(parsed.success).toBe(true)
      expect(dataset.data.length).toBe(12 * 30 * 24)
    }
  })

  it("respects anomaly labeling constraints and expected bounded rates", () => {
    const dataset = generateSyntheticDataset({
      seed: 99,
      months: 12,
      scenarioProfile: "festival-high-demand",
      startDateIso: "2025-01-01T00:00:00.000Z",
    })

    const anomalyCount = dataset.data.filter((point) => point.anomalyLabel !== null).length
    const anomalyRate = anomalyCount / dataset.data.length

    expect(anomalyRate).toBeGreaterThan(0.015)
    expect(anomalyRate).toBeLessThan(0.05)

    const hasInvalidLabel = dataset.data.some(
      (point) =>
        point.anomalyLabel !== null &&
        !["spike", "drift", "sensor_fault", "outage_drop"].includes(point.anomalyLabel),
    )
    expect(hasInvalidLabel).toBe(false)
  })
})
