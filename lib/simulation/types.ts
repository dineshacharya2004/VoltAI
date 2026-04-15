export type ScenarioProfile =
  | "normal-summer-day"
  | "monsoon-low-solar"
  | "festival-high-demand"
  | "grid-price-spike"

export type AnomalyType = "spike" | "drift" | "sensor_fault" | "outage_drop"

export interface WeatherFeatures {
  temperatureC: number
  cloudCover: number
  irradiance: number
}

export interface DatasetPoint {
  timestamp: string
  hourIndex: number
  demandKwh: number
  solarKwh: number
  batterySocKwh: number
  gridTariffInrPerKwh: number
  occupancy: number
  applianceEvent: number
  weather: WeatherFeatures
  anomalyLabel: AnomalyType | null
}

export interface DatasetMetadata {
  traceId: string
  seed: number
  generatedAt: string
  scenarioProfile: ScenarioProfile
  anomalyRate: number
  months: number
  startTimestamp: string
  assumptions: string[]
}

export interface SyntheticDataset {
  metadata: DatasetMetadata
  data: DatasetPoint[]
}

export interface ScenarioConfig {
  profile: ScenarioProfile
  demandMultiplier: number
  solarMultiplier: number
  cloudBias: number
  occupancyBias: number
  tariffPeakMultiplier: number
  anomalyRate: number
}
