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
