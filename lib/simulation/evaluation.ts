import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runModelSimulationSuite, type AblationConfig, type AnomalyModelOutput, type ForecastModelOutput } from "@/lib/simulation/model-simulators"
import { listScenarioProfiles } from "@/lib/simulation/scenarios"
import type { ScenarioProfile, SyntheticDataset } from "@/lib/simulation/types"

export interface ForecastMetrics {
  mae: number
  rmse: number
  mape: number
}

export interface AnomalyMetrics {
  precision: number
  recall: number
  f1: number
  aurocProxy: number
  tp: number
  fp: number
  fn: number
  tn: number
}

export interface CalibrationBucket {
  bucket: string
  avgConfidence: number
  observedError: number
  modelCount: number
}

export interface ForecastLeaderboardRow {
  modelId: string
  modelName: string
  family: "demand" | "solar"
  confidence: number
  latencyMs: number
  mae: number
  rmse: number
  mape: number
  score: number
  rank: number
}

export interface AnomalyLeaderboardRow {
  modelId: string
  modelName: string
  confidence: number
  latencyMs: number
  precision: number
  recall: number
  f1: number
  aurocProxy: number
  score: number
  rank: number
}

export interface StressTestSummary {
  mostRobustModel: string
  averageForecastMae: number
  maxScenarioDriftPct: number
  robustnessScore: number
  scenarioResults: Array<{
    scenario: ScenarioProfile
    avgForecastMae: number
    avgAnomalyF1: number
  }>
}

export interface ForecastHybridComparison {
  family: "demand" | "solar"
  hybridModelId: string
  hybridModelName: string
  hybridMetrics: {
    mae: number
    rmse: number
    mape: number
    score: number
    rank: number
  }
  bestBaseline: {
    modelId: string
    modelName: string
    mae: number
    rmse: number
    mape: number
    score: number
    rank: number
  }
  averageBaseline: {
    mae: number
    rmse: number
    mape: number
    score: number
  }
  improvementPctVsBestBaseline: {
    mae: number
    rmse: number
    mape: number
    score: number
  }
  improvementPctVsAverageBaseline: {
    mae: number
    rmse: number
    mape: number
    score: number
  }
  isHybridWinner: boolean
}

export interface AnomalyHybridComparison {
  hybridModelId: string
  hybridModelName: string
  hybridMetrics: {
    precision: number
    recall: number
    f1: number
    aurocProxy: number
    score: number
    rank: number
  }
  bestBaseline: {
    modelId: string
    modelName: string
    precision: number
    recall: number
    f1: number
    aurocProxy: number
    score: number
    rank: number
  }
  averageBaseline: {
    precision: number
    recall: number
    f1: number
    aurocProxy: number
    score: number
  }
  improvementPctVsBestBaseline: {
    precision: number
    recall: number
    f1: number
    aurocProxy: number
    score: number
  }
  improvementPctVsAverageBaseline: {
    precision: number
    recall: number
    f1: number
    aurocProxy: number
    score: number
  }
  isHybridWinner: boolean
}

export interface HybridComparisonSummary {
  forecast: ForecastHybridComparison[]
  anomaly: AnomalyHybridComparison[]
}

function mean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function computeForecastMetrics(rows: Array<{ predicted: number; actual: number }>): ForecastMetrics {
  if (!rows.length) {
    return { mae: 0, rmse: 0, mape: 0 }
  }

  const absErrors = rows.map((row) => Math.abs(row.predicted - row.actual))
  const squaredErrors = rows.map((row) => (row.predicted - row.actual) ** 2)
  const ape = rows.map((row) => {
    if (row.actual <= 0.0001) return 0
    return Math.abs((row.predicted - row.actual) / row.actual)
  })

  return {
    mae: round(mean(absErrors), 4),
    rmse: round(Math.sqrt(mean(squaredErrors)), 4),
    mape: round(mean(ape) * 100, 3),
  }
}

function rocAucProxy(points: Array<{ score: number; positive: boolean }>) {
  if (!points.length) return 0
  const thresholds = Array.from({ length: 21 }, (_, idx) => idx / 20)
  const roc = thresholds.map((threshold) => {
    let tp = 0
    let fp = 0
    let fn = 0
    let tn = 0
    for (const point of points) {
      const predicted = point.score >= threshold
      if (predicted && point.positive) tp += 1
      else if (predicted && !point.positive) fp += 1
      else if (!predicted && point.positive) fn += 1
      else tn += 1
    }
    const tpr = tp + fn === 0 ? 0 : tp / (tp + fn)
    const fpr = fp + tn === 0 ? 0 : fp / (fp + tn)
    return { tpr, fpr }
  })

  const sorted = roc.sort((a, b) => a.fpr - b.fpr)
  let auc = 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const width = curr.fpr - prev.fpr
    const height = (curr.tpr + prev.tpr) / 2
    auc += width * height
  }
  return round(Math.max(0, Math.min(1, auc)), 4)
}

export function computeAnomalyMetrics(rows: Array<{ flagged: boolean; actualLabel: string | null; score: number }>): AnomalyMetrics {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0

  for (const row of rows) {
    const positive = row.actualLabel !== null
    if (row.flagged && positive) tp += 1
    else if (row.flagged && !positive) fp += 1
    else if (!row.flagged && positive) fn += 1
    else tn += 1
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn)
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  const aurocProxy = rocAucProxy(rows.map((row) => ({ score: row.score, positive: row.actualLabel !== null })))

  return {
    precision: round(precision, 4),
    recall: round(recall, 4),
    f1: round(f1, 4),
    aurocProxy,
    tp,
    fp,
    fn,
    tn,
  }
}

export function buildCalibrationBuckets(models: ForecastModelOutput[]): CalibrationBucket[] {
  const ranges: Array<[number, number]> = [
    [0.6, 0.7],
    [0.7, 0.8],
    [0.8, 0.9],
    [0.9, 1.01],
  ]

  return ranges.map(([min, max]) => {
    const bucketModels = models.filter((model) => model.confidence >= min && model.confidence < max)
    const errors = bucketModels.map((model) => computeForecastMetrics(model.predictions).mae)
    return {
      bucket: `${Math.round(min * 100)}-${Math.round((max === 1.01 ? 1 : max) * 100)}%`,
      avgConfidence: round(mean(bucketModels.map((model) => model.confidence)), 4),
      observedError: round(mean(errors), 4),
      modelCount: bucketModels.length,
    }
  })
}

function forecastScore(metrics: ForecastMetrics, confidence: number, latencyMs: number) {
  return round(100 - metrics.mae * 14 - metrics.rmse * 10 - metrics.mape * 0.5 + confidence * 8 - latencyMs * 0.05, 3)
}

function anomalyScore(metrics: AnomalyMetrics, confidence: number, latencyMs: number) {
  return round(metrics.f1 * 55 + metrics.aurocProxy * 35 + confidence * 10 - latencyMs * 0.06, 3)
}

export function buildForecastLeaderboard(
  demandModels: ForecastModelOutput[],
  solarModels: ForecastModelOutput[],
  sortBy: "mae" | "rmse" | "mape" | "score",
): ForecastLeaderboardRow[] {
  const all = [
    ...demandModels.map((model) => ({ model, family: "demand" as const })),
    ...solarModels.map((model) => ({ model, family: "solar" as const })),
  ]

  const rows = all.map(({ model, family }) => {
    const metrics = computeForecastMetrics(model.predictions)
    return {
      modelId: model.modelId,
      modelName: model.modelName,
      family,
      confidence: model.confidence,
      latencyMs: model.latencyMs,
      mae: metrics.mae,
      rmse: metrics.rmse,
      mape: metrics.mape,
      score: forecastScore(metrics, model.confidence, model.latencyMs),
      rank: 0,
    }
  })

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score
    if (sortBy === "mae") return a.mae - b.mae
    if (sortBy === "rmse") return a.rmse - b.rmse
    return a.mape - b.mape
  })

  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }))
}

export function buildAnomalyLeaderboard(models: AnomalyModelOutput[]): AnomalyLeaderboardRow[] {
  const rows = models.map((model) => {
    const metrics = computeAnomalyMetrics(model.scores)
    return {
      modelId: model.modelId,
      modelName: model.modelName,
      confidence: model.confidence,
      latencyMs: model.latencyMs,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      aurocProxy: metrics.aurocProxy,
      score: anomalyScore(metrics, model.confidence, model.latencyMs),
      rank: 0,
    }
  })

  const sorted = [...rows].sort((a, b) => b.score - a.score)
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }))
}

function averageForecastMae(rows: ForecastLeaderboardRow[]) {
  return mean(rows.map((row) => row.mae))
}

function averageAnomalyF1(rows: AnomalyLeaderboardRow[]) {
  return mean(rows.map((row) => row.f1))
}

function safeImprovement(lowerIsBetter: boolean, hybridValue: number, baselineValue: number) {
  if (Math.abs(baselineValue) <= 0.000001) return 0
  if (lowerIsBetter) {
    return round(((baselineValue - hybridValue) / Math.abs(baselineValue)) * 100, 3)
  }
  return round(((hybridValue - baselineValue) / Math.abs(baselineValue)) * 100, 3)
}

function isForecastHybrid(modelId: string) {
  return modelId.includes("hybrid") || modelId.includes("stage2")
}

function isAnomalyHybrid(modelId: string) {
  return modelId.includes("fused") || modelId.includes("hybrid")
}

export function buildHybridComparison(
  forecastRows: ForecastLeaderboardRow[],
  anomalyRows: AnomalyLeaderboardRow[],
): HybridComparisonSummary {
  const forecastHybridRows = forecastRows.filter((row) => isForecastHybrid(row.modelId))
  const forecastBaselineRows = forecastRows.filter((row) => !isForecastHybrid(row.modelId))

  const forecastFamilies: Array<"demand" | "solar"> = ["demand", "solar"]
  const forecastComparison = forecastFamilies
    .map((family) => {
      const familyHybridRows = forecastHybridRows.filter((row) => row.family === family)
      const familyBaselineRows = forecastBaselineRows.filter((row) => row.family === family)
      const hybridRow = [...familyHybridRows].sort((a, b) => a.rank - b.rank)[0]
      const bestBaseline = [...familyBaselineRows].sort((a, b) => a.rank - b.rank)[0]
      if (!hybridRow || !bestBaseline || !familyBaselineRows.length) return null

      const avgBaselineMae = mean(familyBaselineRows.map((row) => row.mae))
      const avgBaselineRmse = mean(familyBaselineRows.map((row) => row.rmse))
      const avgBaselineMape = mean(familyBaselineRows.map((row) => row.mape))
      const avgBaselineScore = mean(familyBaselineRows.map((row) => row.score))

      return {
        family,
        hybridModelId: hybridRow.modelId,
        hybridModelName: hybridRow.modelName,
        hybridMetrics: {
          mae: hybridRow.mae,
          rmse: hybridRow.rmse,
          mape: hybridRow.mape,
          score: hybridRow.score,
          rank: hybridRow.rank,
        },
        bestBaseline: {
          modelId: bestBaseline.modelId,
          modelName: bestBaseline.modelName,
          mae: bestBaseline.mae,
          rmse: bestBaseline.rmse,
          mape: bestBaseline.mape,
          score: bestBaseline.score,
          rank: bestBaseline.rank,
        },
        averageBaseline: {
          mae: round(avgBaselineMae, 4),
          rmse: round(avgBaselineRmse, 4),
          mape: round(avgBaselineMape, 3),
          score: round(avgBaselineScore, 3),
        },
        improvementPctVsBestBaseline: {
          mae: safeImprovement(true, hybridRow.mae, bestBaseline.mae),
          rmse: safeImprovement(true, hybridRow.rmse, bestBaseline.rmse),
          mape: safeImprovement(true, hybridRow.mape, bestBaseline.mape),
          score: safeImprovement(false, hybridRow.score, bestBaseline.score),
        },
        improvementPctVsAverageBaseline: {
          mae: safeImprovement(true, hybridRow.mae, avgBaselineMae),
          rmse: safeImprovement(true, hybridRow.rmse, avgBaselineRmse),
          mape: safeImprovement(true, hybridRow.mape, avgBaselineMape),
          score: safeImprovement(false, hybridRow.score, avgBaselineScore),
        },
        isHybridWinner: hybridRow.rank < bestBaseline.rank,
      }
    })
    .filter((item): item is ForecastHybridComparison => item !== null)

  const anomalyHybridRows = anomalyRows.filter((row) => isAnomalyHybrid(row.modelId))
  const anomalyBaselineRows = anomalyRows.filter((row) => !isAnomalyHybrid(row.modelId))
  const anomalyHybrid = [...anomalyHybridRows].sort((a, b) => a.rank - b.rank)[0]
  const anomalyBestBaseline = [...anomalyBaselineRows].sort((a, b) => a.rank - b.rank)[0]

  const anomalyComparison: AnomalyHybridComparison[] = []
  if (anomalyHybrid && anomalyBestBaseline && anomalyBaselineRows.length) {
    const avgPrecision = mean(anomalyBaselineRows.map((row) => row.precision))
    const avgRecall = mean(anomalyBaselineRows.map((row) => row.recall))
    const avgF1 = mean(anomalyBaselineRows.map((row) => row.f1))
    const avgAuroc = mean(anomalyBaselineRows.map((row) => row.aurocProxy))
    const avgScore = mean(anomalyBaselineRows.map((row) => row.score))

    anomalyComparison.push({
      hybridModelId: anomalyHybrid.modelId,
      hybridModelName: anomalyHybrid.modelName,
      hybridMetrics: {
        precision: anomalyHybrid.precision,
        recall: anomalyHybrid.recall,
        f1: anomalyHybrid.f1,
        aurocProxy: anomalyHybrid.aurocProxy,
        score: anomalyHybrid.score,
        rank: anomalyHybrid.rank,
      },
      bestBaseline: {
        modelId: anomalyBestBaseline.modelId,
        modelName: anomalyBestBaseline.modelName,
        precision: anomalyBestBaseline.precision,
        recall: anomalyBestBaseline.recall,
        f1: anomalyBestBaseline.f1,
        aurocProxy: anomalyBestBaseline.aurocProxy,
        score: anomalyBestBaseline.score,
        rank: anomalyBestBaseline.rank,
      },
      averageBaseline: {
        precision: round(avgPrecision, 4),
        recall: round(avgRecall, 4),
        f1: round(avgF1, 4),
        aurocProxy: round(avgAuroc, 4),
        score: round(avgScore, 3),
      },
      improvementPctVsBestBaseline: {
        precision: safeImprovement(false, anomalyHybrid.precision, anomalyBestBaseline.precision),
        recall: safeImprovement(false, anomalyHybrid.recall, anomalyBestBaseline.recall),
        f1: safeImprovement(false, anomalyHybrid.f1, anomalyBestBaseline.f1),
        aurocProxy: safeImprovement(false, anomalyHybrid.aurocProxy, anomalyBestBaseline.aurocProxy),
        score: safeImprovement(false, anomalyHybrid.score, anomalyBestBaseline.score),
      },
      improvementPctVsAverageBaseline: {
        precision: safeImprovement(false, anomalyHybrid.precision, avgPrecision),
        recall: safeImprovement(false, anomalyHybrid.recall, avgRecall),
        f1: safeImprovement(false, anomalyHybrid.f1, avgF1),
        aurocProxy: safeImprovement(false, anomalyHybrid.aurocProxy, avgAuroc),
        score: safeImprovement(false, anomalyHybrid.score, avgScore),
      },
      isHybridWinner: anomalyHybrid.rank < anomalyBestBaseline.rank,
    })
  }

  return {
    forecast: forecastComparison,
    anomaly: anomalyComparison,
  }
}

export function buildStressTestSummary(seed: number, months: number, horizonHours: number): StressTestSummary {
  const scenarioResults = listScenarioProfiles().map((scenario) => {
    const dataset = generateSyntheticDataset({
      seed,
      months,
      scenarioProfile: scenario,
    })
    const suite = runModelSimulationSuite({
      seed,
      scenarioProfile: scenario,
      dataset,
      horizonHours,
    })

    const forecastRows = buildForecastLeaderboard(suite.demandModels, suite.solarModels, "score")
    const anomalyRows = buildAnomalyLeaderboard(suite.anomalyModels)
    return {
      scenario,
      avgForecastMae: round(averageForecastMae(forecastRows), 4),
      avgAnomalyF1: round(averageAnomalyF1(anomalyRows), 4),
      topModel: forecastRows[0]?.modelName ?? "n/a",
    }
  })

  const avgMae = mean(scenarioResults.map((result) => result.avgForecastMae))
  const maxMae = Math.max(...scenarioResults.map((result) => result.avgForecastMae))
  const minMae = Math.min(...scenarioResults.map((result) => result.avgForecastMae))
  const driftPct = maxMae <= 0.0001 ? 0 : ((maxMae - minMae) / maxMae) * 100

  const topModelCounts = scenarioResults.reduce<Record<string, number>>((acc, result) => {
    acc[result.topModel] = (acc[result.topModel] ?? 0) + 1
    return acc
  }, {})
  const mostRobustModel =
    Object.entries(topModelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "n/a"

  const robustnessScore = round(Math.max(0, 100 - driftPct * 1.2 - avgMae * 28), 3)

  return {
    mostRobustModel,
    averageForecastMae: round(avgMae, 4),
    maxScenarioDriftPct: round(driftPct, 3),
    robustnessScore,
    scenarioResults,
  }
}

export function buildAblationDelta(
  baselineForecast: ForecastLeaderboardRow[],
  ablatedForecast: ForecastLeaderboardRow[],
  baselineAnomaly: AnomalyLeaderboardRow[],
  ablatedAnomaly: AnomalyLeaderboardRow[],
) {
  const forecastDelta = ablatedForecast.map((row) => {
    const base = baselineForecast.find((item) => item.modelId === row.modelId)
    return {
      modelId: row.modelId,
      modelName: row.modelName,
      maeDelta: round(row.mae - (base?.mae ?? 0), 4),
      rmseDelta: round(row.rmse - (base?.rmse ?? 0), 4),
      mapeDelta: round(row.mape - (base?.mape ?? 0), 4),
      scoreDelta: round(row.score - (base?.score ?? 0), 4),
    }
  })

  const anomalyDelta = ablatedAnomaly.map((row) => {
    const base = baselineAnomaly.find((item) => item.modelId === row.modelId)
    return {
      modelId: row.modelId,
      modelName: row.modelName,
      f1Delta: round(row.f1 - (base?.f1 ?? 0), 4),
      aurocDelta: round(row.aurocProxy - (base?.aurocProxy ?? 0), 4),
      scoreDelta: round(row.score - (base?.score ?? 0), 4),
    }
  })

  return { forecastDelta, anomalyDelta }
}

export function runEvaluationWorkflow({
  seed,
  scenarioProfile,
  dataset,
  horizonHours,
  sortBy,
  ablation,
}: {
  seed: number
  scenarioProfile: ScenarioProfile
  dataset: SyntheticDataset
  horizonHours: number
  sortBy: "mae" | "rmse" | "mape" | "score"
  ablation: AblationConfig
}) {
  const baselineSuite = runModelSimulationSuite({
    seed,
    scenarioProfile,
    dataset,
    horizonHours,
  })
  const ablatedSuite = runModelSimulationSuite({
    seed,
    scenarioProfile,
    dataset,
    horizonHours,
    ablation,
  })

  const baselineForecast = buildForecastLeaderboard(baselineSuite.demandModels, baselineSuite.solarModels, sortBy)
  const baselineAnomaly = buildAnomalyLeaderboard(baselineSuite.anomalyModels)
  const ablatedForecast = buildForecastLeaderboard(ablatedSuite.demandModels, ablatedSuite.solarModels, sortBy)
  const ablatedAnomaly = buildAnomalyLeaderboard(ablatedSuite.anomalyModels)

  const calibration = buildCalibrationBuckets(ablatedSuite.demandModels.concat(ablatedSuite.solarModels))
  const stressTestSummary = buildStressTestSummary(seed, dataset.metadata.months, horizonHours)
  const deltas = buildAblationDelta(baselineForecast, ablatedForecast, baselineAnomaly, ablatedAnomaly)
  const comparison = buildHybridComparison(ablatedForecast, ablatedAnomaly)

  return {
    forecastLeaderboard: ablatedForecast,
    anomalyLeaderboard: ablatedAnomaly,
    calibration,
    stressTestSummary,
    ablationDeltas: deltas,
    comparison,
  }
}
