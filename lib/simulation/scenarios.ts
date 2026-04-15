import type { ScenarioConfig, ScenarioProfile } from "@/lib/simulation/types"

const SCENARIOS: Record<ScenarioProfile, ScenarioConfig> = {
  "normal-summer-day": {
    profile: "normal-summer-day",
    demandMultiplier: 1,
    solarMultiplier: 1.05,
    cloudBias: 0.28,
    occupancyBias: 0.52,
    tariffPeakMultiplier: 1,
    anomalyRate: 0.012,
  },
  "monsoon-low-solar": {
    profile: "monsoon-low-solar",
    demandMultiplier: 1.08,
    solarMultiplier: 0.62,
    cloudBias: 0.76,
    occupancyBias: 0.56,
    tariffPeakMultiplier: 1.08,
    anomalyRate: 0.02,
  },
  "festival-high-demand": {
    profile: "festival-high-demand",
    demandMultiplier: 1.35,
    solarMultiplier: 0.95,
    cloudBias: 0.33,
    occupancyBias: 0.72,
    tariffPeakMultiplier: 1.12,
    anomalyRate: 0.028,
  },
  "grid-price-spike": {
    profile: "grid-price-spike",
    demandMultiplier: 1.04,
    solarMultiplier: 1,
    cloudBias: 0.35,
    occupancyBias: 0.55,
    tariffPeakMultiplier: 1.45,
    anomalyRate: 0.015,
  },
}

export function getScenarioConfig(profile: ScenarioProfile): ScenarioConfig {
  return SCENARIOS[profile]
}

export function listScenarioProfiles(): ScenarioProfile[] {
  return Object.keys(SCENARIOS) as ScenarioProfile[]
}
