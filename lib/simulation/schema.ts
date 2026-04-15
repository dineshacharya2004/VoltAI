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
