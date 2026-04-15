import { clamp, createSeededRng, createTraceId } from "@/lib/simulation/seeded-rng"
import { getScenarioConfig } from "@/lib/simulation/scenarios"
import type { AnomalyType, DatasetPoint, ScenarioProfile, SyntheticDataset } from "@/lib/simulation/types"

interface GenerateDatasetOptions {
  seed: number
  months?: number
  scenarioProfile: ScenarioProfile
  startDateIso?: string
}

function getDaylightFactor(hour: number) {
  const normalized = Math.sin(((hour - 6) / 12) * Math.PI)
  return Math.max(0, normalized)
}

function pickAnomalyType(hour: number): AnomalyType {
  if (hour >= 19 && hour <= 22) return "spike"
  if (hour >= 11 && hour <= 15) return "drift"
  if (hour >= 0 && hour <= 4) return "sensor_fault"
  return "outage_drop"
}

export function generateSyntheticDataset({
  seed,
  months = 12,
  scenarioProfile,
  startDateIso,
}: GenerateDatasetOptions): SyntheticDataset {
  const rng = createSeededRng(seed)
  const scenario = getScenarioConfig(scenarioProfile)
  const start = startDateIso ? new Date(startDateIso) : new Date("2025-01-01T00:00:00.000Z")
  const totalHours = months * 30 * 24

  const points: DatasetPoint[] = []
  let batterySoc = 4.8
  const batteryCapacityKwh = 10

  for (let i = 0; i < totalHours; i++) {
    const timestamp = new Date(start.getTime() + i * 3600_000)
    const hour = timestamp.getUTCHours()
    const dayOfWeek = timestamp.getUTCDay()
    const dayOfYear = Math.floor((timestamp.getTime() - Date.UTC(timestamp.getUTCFullYear(), 0, 0)) / 86400000)

    const weeklyFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.93 : 1.04
    const seasonalDemand = 1 + 0.1 * Math.sin((2 * Math.PI * dayOfYear) / 365)
    const seasonalSolar = 1 + 0.12 * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365)

    const occupancy = clamp(
      scenario.occupancyBias + (hour >= 19 || hour <= 6 ? 0.22 : -0.12) + rng.nextInRange(-0.06, 0.06),
      0,
      1,
    )
    const applianceEvent = rng.next() < 0.08 ? 1 : 0

    const temperatureC =
      26 + 8 * Math.sin((2 * Math.PI * (dayOfYear - 30)) / 365) + rng.nextInRange(-2.5, 2.5) + (hour >= 13 ? 1.2 : 0)
    const cloudCover = clamp(scenario.cloudBias + rng.nextInRange(-0.2, 0.2), 0, 1)

    const daylightFactor = getDaylightFactor(hour)
    const irradiance = clamp(950 * daylightFactor * (1 - 0.65 * cloudCover), 0, 1000)

    const baseDemand = 1.55 + 0.18 * occupancy + 0.22 * applianceEvent
    let demandKwh =
      baseDemand *
      weeklyFactor *
      seasonalDemand *
      scenario.demandMultiplier *
      (1 + Math.max(0, temperatureC - 28) * 0.012 + Math.max(0, 22 - temperatureC) * 0.01)

    let solarKwh =
      4.8 * daylightFactor * (irradiance / 1000) * seasonalSolar * scenario.solarMultiplier * clamp(1 - cloudCover * 0.35, 0.2, 1)

    let anomalyLabel: AnomalyType | null = null
    if (rng.next() < scenario.anomalyRate) {
      anomalyLabel = pickAnomalyType(hour)
      if (anomalyLabel === "spike") {
        demandKwh *= 1.75
      } else if (anomalyLabel === "drift") {
        solarKwh *= 0.78
      } else if (anomalyLabel === "sensor_fault") {
        demandKwh *= 0.92
      } else if (anomalyLabel === "outage_drop") {
        solarKwh *= 0.35
      }
    }

    const isPeak = hour >= 18 && hour <= 22
    const isMid = hour >= 11 && hour <= 16
    const baseTariff = isPeak ? 8.5 : isMid ? 5.8 : 4.2
    const gridTariffInrPerKwh = Number((baseTariff * scenario.tariffPeakMultiplier).toFixed(2))

    const net = solarKwh - demandKwh
    if (net >= 0) {
      batterySoc = clamp(batterySoc + net * 0.55, 0, batteryCapacityKwh)
    } else {
      batterySoc = clamp(batterySoc + net * 0.7, 0, batteryCapacityKwh)
    }

    points.push({
      timestamp: timestamp.toISOString(),
      hourIndex: i,
      demandKwh: Number(demandKwh.toFixed(3)),
      solarKwh: Number(solarKwh.toFixed(3)),
      batterySocKwh: Number(batterySoc.toFixed(3)),
      gridTariffInrPerKwh,
      occupancy: Number(occupancy.toFixed(3)),
      applianceEvent,
      weather: {
        temperatureC: Number(temperatureC.toFixed(2)),
        cloudCover: Number(cloudCover.toFixed(3)),
        irradiance: Number(irradiance.toFixed(2)),
      },
      anomalyLabel,
    })
  }

  return {
    metadata: {
      traceId: createTraceId(seed, scenario.profile, months),
      seed,
      generatedAt: new Date().toISOString(),
      scenarioProfile,
      anomalyRate: scenario.anomalyRate,
      months,
      startTimestamp: points[0]?.timestamp ?? start.toISOString(),
      assumptions: [
        "Simulation-only research prototype; no model training performed.",
        "30-day month approximation used for deterministic generation speed.",
        "Battery charge/discharge efficiency approximated with fixed coefficients.",
      ],
    },
    data: points,
  }
}
