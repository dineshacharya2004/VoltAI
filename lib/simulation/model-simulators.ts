import { createSeededRng } from "@/lib/simulation/seeded-rng"
import { getScenarioConfig } from "@/lib/simulation/scenarios"
import type { DatasetPoint, ScenarioProfile, SyntheticDataset } from "@/lib/simulation/types"

export interface ForecastPointPrediction {
  timestamp: string
  predicted: number
  actual: number
  lower: number
  upper: number
}

export interface FeatureAttribution {
  feature: string
  contribution: number
}

export interface ForecastModelOutput {
  modelId: string
  modelName: string
  target: "demand" | "solar"
  predictions: ForecastPointPrediction[]
  confidence: number
  latencyMs: number
  explainability: {
    topFactors: FeatureAttribution[]
  }
  assumptions: string[]
}

export interface AnomalyPointScore {
  timestamp: string
  score: number
  flagged: boolean
  actualLabel: string | null
}

export interface AnomalyModelOutput {
  modelId: string
  modelName: string
  threshold: number
  confidence: number
  latencyMs: number
  explainability: {
    topFactors: FeatureAttribution[]
  }
  scores: AnomalyPointScore[]
  assumptions: string[]
}

export interface ModelSimulationBundle {
  demandModels: ForecastModelOutput[]
  solarModels: ForecastModelOutput[]
  anomalyModels: AnomalyModelOutput[]
}

export interface ModelSimulationInput {
  seed: number
  scenarioProfile: ScenarioProfile
  dataset: SyntheticDataset
  horizonHours?: number
  ablation?: AblationConfig
}

export interface AblationConfig {
  withoutWeather?: boolean
  withoutTemporal?: boolean
  withoutOccupancy?: boolean
}

function mean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]) {
  if (!values.length) return 0
  const m = mean(values)
  const variance = mean(values.map((value) => (value - m) ** 2))
  return Math.sqrt(variance)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function modelSeed(seed: number, modelId: string) {
  let hash = 0
  for (let i = 0; i < modelId.length; i++) {
    hash = (hash * 31 + modelId.charCodeAt(i)) >>> 0
  }
  return (seed + hash) >>> 0
}

function calculateLatencyMs(seed: number, modelId: string, min: number, max: number) {
  const rng = createSeededRng(modelSeed(seed, modelId))
  return rng.nextInt(min, max)
}

function confidenceFromVolatility(volatility: number, modelSensitivity: number) {
  const confidence = 0.95 - volatility * modelSensitivity
  return round(clamp(confidence, 0.6, 0.96), 3)
}

function buildIntervals(predicted: number, volatility: number, confidence: number, widthScale: number) {
  const uncertainty = Math.max(0.05, volatility * widthScale * (1.05 - confidence))
  return {
    lower: round(Math.max(0, predicted - uncertainty), 3),
    upper: round(predicted + uncertainty, 3),
  }
}

function evaluateWindow(dataset: SyntheticDataset, horizonHours: number) {
  const points = dataset.data
  const start = Math.max(24 * 14, points.length - horizonHours)
  return points.slice(start, start + horizonHours)
}

function getLag(points: DatasetPoint[], index: number, lag: number, key: "demandKwh" | "solarKwh") {
  const lagIndex = index - lag
  if (lagIndex < 0) return points[index][key]
  return points[lagIndex][key]
}

function ablationSeverity(ablation: AblationConfig | undefined) {
  if (!ablation) return 0
  let severity = 0
  if (ablation.withoutWeather) severity += 1
  if (ablation.withoutTemporal) severity += 1
  if (ablation.withoutOccupancy) severity += 1
  return severity
}

function applyForecastAblation(
  model: ForecastModelOutput,
  ablation: AblationConfig | undefined,
  scenarioProfile: ScenarioProfile,
): ForecastModelOutput {
  const severity = ablationSeverity(ablation)
  if (!severity) return model

  const weatherDependent = model.target === "solar" || model.modelId.includes("prophet") || model.modelId.includes("xgboost")
  const temporalDependent = model.modelId.includes("lstm") || model.modelId.includes("prophet") || model.modelId.includes("gbm")
  const occupancyDependent = model.modelId.includes("lstm") || model.modelId.includes("xgboost")

  const scenarioMultiplier = scenarioProfile === "monsoon-low-solar" ? 1.15 : scenarioProfile === "festival-high-demand" ? 1.1 : 1

  const predictions = model.predictions.map((prediction, idx) => {
    let penalty = 0
    if (ablation?.withoutWeather && weatherDependent) {
      penalty += 0.11 * scenarioMultiplier
    }
    if (ablation?.withoutTemporal && temporalDependent) {
      penalty += 0.13 * scenarioMultiplier
    }
    if (ablation?.withoutOccupancy && occupancyDependent) {
      penalty += 0.09 * scenarioMultiplier
    }

    const deterministicWave = 1 + Math.sin((idx % 24) / 24 * 2 * Math.PI) * 0.25
    const adjusted = prediction.predicted * (1 + penalty * deterministicWave)
    const adjustedConfidence = clamp(model.confidence - penalty * 0.4, 0.52, 0.95)
    const intervalSpread = Math.max(0.05, (prediction.upper - prediction.lower) * (1 + penalty * 1.4))

    return {
      ...prediction,
      predicted: round(Math.max(0, adjusted), 3),
      lower: round(Math.max(0, adjusted - intervalSpread / 2), 3),
      upper: round(Math.max(0, adjusted + intervalSpread / 2), 3),
      actual: prediction.actual,
      confidence: adjustedConfidence,
    }
  })

  const avgConfidence = mean(predictions.map((p) => p.confidence))

  return {
    ...model,
    predictions: predictions.map(({ confidence: _c, ...rest }) => rest),
    confidence: round(avgConfidence, 3),
    latencyMs: Math.round(model.latencyMs * (1 + 0.1 * severity)),
    assumptions: [
      ...model.assumptions,
      "Ablation mode enabled: selected feature groups removed to measure degradation.",
    ],
  }
}

function applyAnomalyAblation(
  model: AnomalyModelOutput,
  ablation: AblationConfig | undefined,
  scenarioProfile: ScenarioProfile,
): AnomalyModelOutput {
  const severity = ablationSeverity(ablation)
  if (!severity) return model

  const weatherDependent = model.modelId.includes("isolation")
  const temporalDependent = model.modelId.includes("autoencoder")
  const occupancyDependent = model.modelId.includes("autoencoder")
  const scenarioMultiplier = scenarioProfile === "festival-high-demand" ? 1.12 : 1

  const scores = model.scores.map((row, idx) => {
    let penalty = 0
    if (ablation?.withoutWeather && weatherDependent) penalty += 0.1
    if (ablation?.withoutTemporal && temporalDependent) penalty += 0.12
    if (ablation?.withoutOccupancy && occupancyDependent) penalty += 0.08

    const drift = 1 + Math.cos((idx % 24) / 24 * 2 * Math.PI) * 0.2
    const adjustedScore = clamp(row.score * (1 + penalty * drift * scenarioMultiplier), 0, 2)
    return {
      ...row,
      score: round(adjustedScore, 3),
      flagged: adjustedScore >= model.threshold,
    }
  })

  return {
    ...model,
    scores,
    confidence: round(clamp(model.confidence - severity * 0.06, 0.5, 0.95), 3),
    latencyMs: Math.round(model.latencyMs * (1 + 0.08 * severity)),
    assumptions: [
      ...model.assumptions,
      "Ablation mode enabled: anomaly score reliability reduced by missing feature groups.",
    ],
  }
}

function createDemandLstmModel(points: DatasetPoint[], seed: number, volatility: number): ForecastModelOutput {
  const modelId = "demand-lstm-simulator"
  const confidence = confidenceFromVolatility(volatility, 2.1)
  const predictions = points.map((point, index) => {
    // LSTM-style proxy: combines short-memory (t-1), daily recurrence (t-24), and occupancy context.
    const lag1 = getLag(points, index, 1, "demandKwh")
    const lag24 = getLag(points, index, 24, "demandKwh")
    const memory = 0.42 * lag1 + 0.38 * lag24
    const context = 0.17 * (1 + point.occupancy) + 0.08 * point.applianceEvent
    const predicted = round(memory + context, 3)
    const interval = buildIntervals(predicted, volatility, confidence, 1.7)

    return {
      timestamp: point.timestamp,
      predicted,
      actual: round(point.demandKwh, 3),
      lower: interval.lower,
      upper: interval.upper,
    }
  })

  return {
    modelId,
    modelName: "LSTM Temporal Memory Simulator",
    target: "demand",
    predictions,
    confidence,
    latencyMs: calculateLatencyMs(seed, modelId, 32, 48),
    explainability: {
      topFactors: [
        { feature: "lag_1h_demand", contribution: 0.42 },
        { feature: "lag_24h_demand", contribution: 0.38 },
        { feature: "occupancy_signal", contribution: 0.2 },
      ],
    },
    assumptions: [
      "Temporal memory represented through weighted lag features instead of recurrent training.",
      "Occupancy and appliance events act as contextual gates on latent demand state.",
    ],
  }
}

function createDemandProphetModel(points: DatasetPoint[], seed: number, volatility: number): ForecastModelOutput {
  const modelId = "demand-prophet-simulator"
  const confidence = confidenceFromVolatility(volatility, 2.5)
  const baseline = mean(points.map((point) => point.demandKwh))

  const predictions = points.map((point, index) => {
    const ts = new Date(point.timestamp)
    const hour = ts.getUTCHours()
    const weekday = ts.getUTCDay()
    const trend = baseline + index * 0.0012
    const dailySeason = 0.42 * Math.sin(((hour - 7) / 24) * 2 * Math.PI)
    const weeklySeason = weekday === 0 || weekday === 6 ? -0.12 : 0.08
    const exogenous = Math.max(0, point.weather.temperatureC - 29) * 0.025
    const predicted = round(Math.max(0, trend + dailySeason + weeklySeason + exogenous), 3)
    const interval = buildIntervals(predicted, volatility, confidence, 1.95)

    return {
      timestamp: point.timestamp,
      predicted,
      actual: round(point.demandKwh, 3),
      lower: interval.lower,
      upper: interval.upper,
    }
  })

  return {
    modelId,
    modelName: "Prophet Trend-Seasonality Simulator",
    target: "demand",
    predictions,
    confidence,
    latencyMs: calculateLatencyMs(seed, modelId, 24, 37),
    explainability: {
      topFactors: [
        { feature: "daily_seasonality", contribution: 0.41 },
        { feature: "baseline_trend", contribution: 0.35 },
        { feature: "temperature_exogenous", contribution: 0.24 },
      ],
    },
    assumptions: [
      "Trend and seasonality are decomposed analytically with sinusoidal components.",
      "Temperature enters as an additive exogenous regressor for cooling/heating pressure.",
    ],
  }
}

function createDemandXgboostModel(points: DatasetPoint[], seed: number, volatility: number): ForecastModelOutput {
  const modelId = "demand-xgboost-simulator"
  const confidence = confidenceFromVolatility(volatility, 1.85)

  const predictions = points.map((point, index) => {
    // XGBoost-style proxy: interaction-heavy rules approximating tree ensemble splits.
    const lag24 = getLag(points, index, 24, "demandKwh")
    const temp = point.weather.temperatureC
    const occupancy = point.occupancy
    const interaction = occupancy * Math.max(0, temp - 27) * 0.03
    const eventBoost = point.applianceEvent ? 0.28 : 0
    const tariffResponse = point.gridTariffInrPerKwh > 7.5 ? -0.08 : 0.04
    const predicted = round(Math.max(0, 0.72 * lag24 + interaction + eventBoost + tariffResponse), 3)
    const interval = buildIntervals(predicted, volatility, confidence, 1.55)

    return {
      timestamp: point.timestamp,
      predicted,
      actual: round(point.demandKwh, 3),
      lower: interval.lower,
      upper: interval.upper,
    }
  })

  return {
    modelId,
    modelName: "XGBoost Feature-Interaction Simulator",
    target: "demand",
    predictions,
    confidence,
    latencyMs: calculateLatencyMs(seed, modelId, 16, 29),
    explainability: {
      topFactors: [
        { feature: "lag_24h_demand", contribution: 0.46 },
        { feature: "temp_x_occupancy_interaction", contribution: 0.34 },
        { feature: "appliance_event_and_tariff_response", contribution: 0.2 },
      ],
    },
    assumptions: [
      "Split-like interactions are approximated with piecewise feature engineering.",
      "No boosting rounds are trained; interaction weights are scenario-calibrated constants.",
    ],
  }
}

function createSolarCnnModel(points: DatasetPoint[], seed: number, volatility: number): ForecastModelOutput {
  const modelId = "solar-cnn-weather-simulator"
  const confidence = confidenceFromVolatility(volatility, 2.3)

  const predictions = points.map((point) => {
    // CNN-weather proxy: local weather map compressed into weighted spatial-style filters.
    const weatherMapActivation =
      0.52 * (point.weather.irradiance / 1000) +
      0.28 * (1 - point.weather.cloudCover) +
      0.2 * clamp((point.weather.temperatureC - 12) / 25, 0, 1)
    const daylightGate = point.weather.irradiance > 20 ? 1 : 0
    const predicted = round(Math.max(0, 4.9 * weatherMapActivation * daylightGate), 3)
    const interval = buildIntervals(predicted, volatility, confidence, 1.75)

    return {
      timestamp: point.timestamp,
      predicted,
      actual: round(point.solarKwh, 3),
      lower: interval.lower,
      upper: interval.upper,
    }
  })

  return {
    modelId,
    modelName: "CNN Weather-Map Simulator",
    target: "solar",
    predictions,
    confidence,
    latencyMs: calculateLatencyMs(seed, modelId, 27, 42),
    explainability: {
      topFactors: [
        { feature: "irradiance_kernel_response", contribution: 0.52 },
        { feature: "cloud_cover_filter", contribution: 0.28 },
        { feature: "thermal_condition_gate", contribution: 0.2 },
      ],
    },
    assumptions: [
      "Convolutional feature extraction is represented by weighted weather-map activations.",
      "Daylight gating prevents non-physical generation at low irradiance hours.",
    ],
  }
}

function createSolarGbmModel(points: DatasetPoint[], seed: number, volatility: number): ForecastModelOutput {
  const modelId = "solar-gbm-simulator"
  const confidence = confidenceFromVolatility(volatility, 1.95)

  const predictions = points.map((point, index) => {
    const lag24 = getLag(points, index, 24, "solarKwh")
    const irradianceFactor = point.weather.irradiance / 1000
    const cloudPenalty = 1 - point.weather.cloudCover * 0.55
    const blended = 0.58 * lag24 + 2.4 * irradianceFactor * cloudPenalty
    const temporalBoost = new Date(point.timestamp).getUTCHours() >= 11 && new Date(point.timestamp).getUTCHours() <= 14 ? 0.22 : -0.05
    const predicted = round(Math.max(0, blended + temporalBoost), 3)
    const interval = buildIntervals(predicted, volatility, confidence, 1.6)

    return {
      timestamp: point.timestamp,
      predicted,
      actual: round(point.solarKwh, 3),
      lower: interval.lower,
      upper: interval.upper,
    }
  })

  return {
    modelId,
    modelName: "Gradient Boosting Solar Simulator",
    target: "solar",
    predictions,
    confidence,
    latencyMs: calculateLatencyMs(seed, modelId, 15, 28),
    explainability: {
      topFactors: [
        { feature: "lag_24h_solar", contribution: 0.44 },
        { feature: "irradiance_signal", contribution: 0.37 },
        { feature: "cloud_penalty_and_hour_window", contribution: 0.19 },
      ],
    },
    assumptions: [
      "Boosting effects are simulated through additive residual-style feature adjustments.",
      "Temporal midday gain approximates boosted split on solar elevation.",
    ],
  }
}

function createIsolationForestModel(points: DatasetPoint[], seed: number, volatility: number): AnomalyModelOutput {
  const modelId = "anomaly-isolation-forest-simulator"
  const confidence = confidenceFromVolatility(volatility, 2.2)
  const demandValues = points.map((point) => point.demandKwh)
  const solarValues = points.map((point) => point.solarKwh)
  const demandMean = mean(demandValues)
  const solarMean = mean(solarValues)
  const demandStd = Math.max(0.001, stdDev(demandValues))
  const solarStd = Math.max(0.001, stdDev(solarValues))
  const threshold = 0.69

  const scores = points.map((point) => {
    // Isolation proxy: outlier score from normalized distance in demand-solar-weather space.
    const demandZ = Math.abs((point.demandKwh - demandMean) / demandStd)
    const solarZ = Math.abs((point.solarKwh - solarMean) / solarStd)
    const cloudMismatch = point.weather.cloudCover > 0.8 && point.solarKwh > solarMean ? 0.9 : 0
    const score = round(clamp(0.36 * demandZ + 0.33 * solarZ + 0.31 * cloudMismatch, 0, 1.3), 3)
    return {
      timestamp: point.timestamp,
      score,
      flagged: score >= threshold,
      actualLabel: point.anomalyLabel,
    }
  })

  return {
    modelId,
    modelName: "Isolation Forest Simulator",
    threshold,
    confidence,
    latencyMs: calculateLatencyMs(seed, modelId, 13, 24),
    explainability: {
      topFactors: [
        { feature: "demand_outlier_depth", contribution: 0.36 },
        { feature: "solar_outlier_depth", contribution: 0.33 },
        { feature: "cloud_generation_inconsistency", contribution: 0.31 },
      ],
    },
    scores,
    assumptions: [
      "Path-length isolation is approximated using normalized multivariate anomaly distance.",
      "Threshold is fixed for deterministic replay across conference scenarios.",
    ],
  }
}

function createAutoencoderModel(points: DatasetPoint[], seed: number, volatility: number): AnomalyModelOutput {
  const modelId = "anomaly-autoencoder-simulator"
  const confidence = confidenceFromVolatility(volatility, 2)
  const threshold = 0.63

  const scores = points.map((point, index) => {
    // Autoencoder proxy: reconstruction error from expected demand/solar manifold.
    const lag24Demand = getLag(points, index, 24, "demandKwh")
    const lag24Solar = getLag(points, index, 24, "solarKwh")
    const expectedDemand = 0.74 * lag24Demand + 0.16 * (1 + point.occupancy) + 0.1 * point.applianceEvent
    const expectedSolar = 0.61 * lag24Solar + 0.39 * (point.weather.irradiance / 1000) * (1 - point.weather.cloudCover * 0.45)
    const demandError = Math.abs(point.demandKwh - expectedDemand)
    const solarError = Math.abs(point.solarKwh - expectedSolar)
    const score = round(clamp(0.55 * demandError + 0.45 * solarError, 0, 1.4), 3)

    return {
      timestamp: point.timestamp,
      score,
      flagged: score >= threshold,
      actualLabel: point.anomalyLabel,
    }
  })

  return {
    modelId,
    modelName: "Autoencoder Reconstruction Simulator",
    threshold,
    confidence,
    latencyMs: calculateLatencyMs(seed, modelId, 18, 33),
    explainability: {
      topFactors: [
        { feature: "demand_reconstruction_error", contribution: 0.55 },
        { feature: "solar_reconstruction_error", contribution: 0.45 },
      ],
    },
    scores,
    assumptions: [
      "Latent manifold is emulated with deterministic expected-value reconstruction.",
      "Anomaly score is residual energy between observed and reconstructed signals.",
    ],
  }
}

export function runModelSimulationSuite({
  seed,
  scenarioProfile,
  dataset,
  horizonHours = 24,
  ablation,
}: ModelSimulationInput): ModelSimulationBundle {
  const scenario = getScenarioConfig(scenarioProfile)
  const points = evaluateWindow(dataset, horizonHours)

  const demandSeries = points.map((point) => point.demandKwh)
  const solarSeries = points.map((point) => point.solarKwh)
  const demandVolatility = stdDev(demandSeries) / Math.max(0.001, mean(demandSeries))
  const solarVolatility = stdDev(solarSeries) / Math.max(0.001, mean(solarSeries))
  const blendedVolatility = (demandVolatility + solarVolatility) / 2 + scenario.cloudBias * 0.05

  const rawDemandModels: ForecastModelOutput[] = [
    createDemandLstmModel(points, seed, blendedVolatility),
    createDemandProphetModel(points, seed, blendedVolatility),
    createDemandXgboostModel(points, seed, blendedVolatility),
  ]

  const rawSolarModels: ForecastModelOutput[] = [
    createSolarCnnModel(points, seed, blendedVolatility + solarVolatility * 0.15),
    createSolarGbmModel(points, seed, blendedVolatility + solarVolatility * 0.1),
  ]

  const rawAnomalyModels: AnomalyModelOutput[] = [
    createIsolationForestModel(points, seed, blendedVolatility),
    createAutoencoderModel(points, seed, blendedVolatility),
  ]

  const demandModels = rawDemandModels.map((model) => applyForecastAblation(model, ablation, scenarioProfile))
  const solarModels = rawSolarModels.map((model) => applyForecastAblation(model, ablation, scenarioProfile))
  const anomalyModels = rawAnomalyModels.map((model) => applyAnomalyAblation(model, ablation, scenarioProfile))

  return {
    demandModels,
    solarModels,
    anomalyModels,
  }
}
