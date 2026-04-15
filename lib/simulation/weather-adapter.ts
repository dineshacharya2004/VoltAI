import { createSeededRng } from "@/lib/simulation/seeded-rng"
import type { DatasetPoint, ScenarioProfile } from "@/lib/simulation/types"

export type WeatherProviderId = "synthetic" | "open-meteo-sim"

export interface WeatherSignal {
  temperatureC: number
  cloudCover: number
  irradiance: number
  sourceConfidence: number
}

export interface WeatherSignalAdapter {
  providerId: WeatherProviderId
  mode: "simulated" | "api"
  note: string
  buildSignal(input: { point: DatasetPoint; index: number; seed: number; scenarioProfile: ScenarioProfile }): WeatherSignal
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function createSyntheticAdapter(): WeatherSignalAdapter {
  return {
    providerId: "synthetic",
    mode: "simulated",
    note: "Deterministic synthetic weather generated from seeded scenario equations.",
    buildSignal: ({ point }) => ({
      temperatureC: round(point.weather.temperatureC, 3),
      cloudCover: round(point.weather.cloudCover, 4),
      irradiance: round(point.weather.irradiance, 3),
      sourceConfidence: 0.92,
    }),
  }
}

function createOpenMeteoSimAdapter(seed: number): WeatherSignalAdapter {
  return {
    providerId: "open-meteo-sim",
    mode: "api",
    note: "API-style weather proxy: deterministic perturbation simulating forecast ingestion uncertainty.",
    buildSignal: ({ point, index }) => {
      const rng = createSeededRng(seed + 7000 + index * 17)
      const tempNoise = rng.nextInRange(-1.2, 1.2)
      const cloudNoise = rng.nextInRange(-0.08, 0.08)
      const irrNoiseScale = rng.nextInRange(0.93, 1.07)

      return {
        temperatureC: round(point.weather.temperatureC + tempNoise, 3),
        cloudCover: round(clamp(point.weather.cloudCover + cloudNoise, 0, 1), 4),
        irradiance: round(clamp(point.weather.irradiance * irrNoiseScale, 0, 1000), 3),
        sourceConfidence: 0.79,
      }
    },
  }
}

export function resolveWeatherSignalAdapter(provider: WeatherProviderId, seed: number): WeatherSignalAdapter {
  if (provider === "open-meteo-sim") {
    return createOpenMeteoSimAdapter(seed)
  }
  return createSyntheticAdapter()
}
