import { z } from "zod"

export const scenarioProfileSchema = z.enum([
  "normal-summer-day",
  "monsoon-low-solar",
  "festival-high-demand",
  "grid-price-spike",
])

export const anomalyTypeSchema = z.enum(["spike", "drift", "sensor_fault", "outage_drop"])

export const datasetPointSchema = z.object({
  timestamp: z.string().datetime(),
  hourIndex: z.number().int().nonnegative(),
  demandKwh: z.number().nonnegative(),
  solarKwh: z.number().nonnegative(),
  batterySocKwh: z.number().nonnegative(),
  gridTariffInrPerKwh: z.number().positive(),
  occupancy: z.number().min(0).max(1),
  applianceEvent: z.number().int().min(0).max(1),
  weather: z.object({
    temperatureC: z.number(),
    cloudCover: z.number().min(0).max(1),
    irradiance: z.number().min(0).max(1000),
  }),
  anomalyLabel: z.union([anomalyTypeSchema, z.null()]),
})

export const datasetMetadataSchema = z.object({
  traceId: z.string().min(1),
  seed: z.number().int(),
  generatedAt: z.string().datetime(),
  scenarioProfile: scenarioProfileSchema,
  anomalyRate: z.number().min(0).max(1),
  months: z.number().int().min(12).max(24),
  startTimestamp: z.string().datetime(),
  assumptions: z.array(z.string().min(1)).min(1),
})

export const syntheticDatasetSchema = z.object({
  metadata: datasetMetadataSchema,
  data: z.array(datasetPointSchema).min(1),
})

export const datasetApiResponseSchema = z.object({
  success: z.literal(true),
  traceId: z.string().min(1),
  seed: z.number().int(),
  modelVersion: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  validationSummary: z.object({
    schemaValid: z.boolean(),
    hoursGenerated: z.number().int().positive(),
    anomalyCount: z.number().int().nonnegative(),
  }),
  data: syntheticDatasetSchema,
})

export type DatasetApiResponse = z.infer<typeof datasetApiResponseSchema>

const featureAttributionSchema = z.object({
  feature: z.string().min(1),
  contribution: z.number(),
})

const forecastPointPredictionSchema = z.object({
  timestamp: z.string().datetime(),
  predicted: z.number().nonnegative(),
  actual: z.number().nonnegative(),
  lower: z.number().nonnegative(),
  upper: z.number().nonnegative(),
})

const forecastModelOutputSchema = z.object({
  modelId: z.string().min(1),
  modelName: z.string().min(1),
  target: z.enum(["demand", "solar"]),
  predictions: z.array(forecastPointPredictionSchema).min(1),
  confidence: z.number().min(0).max(1),
  latencyMs: z.number().int().positive(),
  explainability: z.object({
    topFactors: z.array(featureAttributionSchema).min(1),
  }),
  assumptions: z.array(z.string().min(1)).min(1),
})

const anomalyPointScoreSchema = z.object({
  timestamp: z.string().datetime(),
  score: z.number().nonnegative(),
  flagged: z.boolean(),
  actualLabel: z.union([anomalyTypeSchema, z.null()]),
})

const anomalyModelOutputSchema = z.object({
  modelId: z.string().min(1),
  modelName: z.string().min(1),
  threshold: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  latencyMs: z.number().int().positive(),
  explainability: z.object({
    topFactors: z.array(featureAttributionSchema).min(1),
  }),
  scores: z.array(anomalyPointScoreSchema).min(1),
  assumptions: z.array(z.string().min(1)).min(1),
})

export const forecastApiResponseSchema = z.object({
  success: z.literal(true),
  traceId: z.string().min(1),
  seed: z.number().int(),
  modelVersion: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  validationSummary: z.object({
    schemaValid: z.boolean(),
    horizonHours: z.number().int().positive(),
    demandModelCount: z.number().int().positive(),
    solarModelCount: z.number().int().positive(),
    anomalyModelCount: z.number().int().positive(),
  }),
  data: z.object({
    metadata: datasetMetadataSchema,
    demandModels: z.array(forecastModelOutputSchema).min(3),
    solarModels: z.array(forecastModelOutputSchema).min(2),
    anomalyModels: z.array(anomalyModelOutputSchema).min(2),
  }),
})

export type ForecastApiResponse = z.infer<typeof forecastApiResponseSchema>

const forecastLeaderboardRowSchema = z.object({
  modelId: z.string().min(1),
  modelName: z.string().min(1),
  family: z.enum(["demand", "solar"]),
  confidence: z.number().min(0).max(1),
  latencyMs: z.number().int().positive(),
  mae: z.number().nonnegative(),
  rmse: z.number().nonnegative(),
  mape: z.number().nonnegative(),
  score: z.number(),
  rank: z.number().int().positive(),
})

const anomalyLeaderboardRowSchema = z.object({
  modelId: z.string().min(1),
  modelName: z.string().min(1),
  confidence: z.number().min(0).max(1),
  latencyMs: z.number().int().positive(),
  precision: z.number().min(0).max(1),
  recall: z.number().min(0).max(1),
  f1: z.number().min(0).max(1),
  aurocProxy: z.number().min(0).max(1),
  score: z.number(),
  rank: z.number().int().positive(),
})

const calibrationBucketSchema = z.object({
  bucket: z.string().min(1),
  avgConfidence: z.number(),
  observedError: z.number(),
  modelCount: z.number().int().nonnegative(),
})

const stressTestSummarySchema = z.object({
  mostRobustModel: z.string().min(1),
  averageForecastMae: z.number().nonnegative(),
  maxScenarioDriftPct: z.number().nonnegative(),
  robustnessScore: z.number(),
  scenarioResults: z.array(
    z.object({
      scenario: scenarioProfileSchema,
      avgForecastMae: z.number().nonnegative(),
      avgAnomalyF1: z.number().min(0).max(1),
    }),
  ),
})

export const evaluationApiResponseSchema = z.object({
  success: z.literal(true),
  traceId: z.string().min(1),
  seed: z.number().int(),
  modelVersion: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  validationSummary: z.object({
    schemaValid: z.boolean(),
    horizonHours: z.number().int().positive(),
    sortBy: z.enum(["mae", "rmse", "mape", "score"]),
    ablation: z.object({
      withoutWeather: z.boolean(),
      withoutTemporal: z.boolean(),
      withoutOccupancy: z.boolean(),
    }),
  }),
  data: z.object({
    forecastLeaderboard: z.array(forecastLeaderboardRowSchema).min(1),
    anomalyLeaderboard: z.array(anomalyLeaderboardRowSchema).min(1),
    calibrationBuckets: z.array(calibrationBucketSchema).min(1),
    stressTestSummary: stressTestSummarySchema,
    ablationDeltas: z.object({
      forecastDelta: z.array(
        z.object({
          modelId: z.string().min(1),
          modelName: z.string().min(1),
          maeDelta: z.number(),
          rmseDelta: z.number(),
          mapeDelta: z.number(),
          scoreDelta: z.number(),
        }),
      ),
      anomalyDelta: z.array(
        z.object({
          modelId: z.string().min(1),
          modelName: z.string().min(1),
          f1Delta: z.number(),
          aurocDelta: z.number(),
          scoreDelta: z.number(),
        }),
      ),
    }),
  }),
})

export type EvaluationApiResponse = z.infer<typeof evaluationApiResponseSchema>
