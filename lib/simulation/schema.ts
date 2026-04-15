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
  causeCandidates: z.array(z.string().min(1)).min(1),
})

const sufficiencyHourlySchema = z.object({
  timestamp: z.string().datetime(),
  predictedDemandKwh: z.number().nonnegative(),
  predictedSolarKwh: z.number().nonnegative(),
  netKwh: z.number(),
  classification: z.enum(["surplus", "deficit", "balanced"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  expectedGridKwh: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  recommendedAction: z.string().min(1),
})

const sufficiencySummarySchema = z.object({
  totalPredictedDemandKwh: z.number().nonnegative(),
  totalPredictedSolarKwh: z.number().nonnegative(),
  projectedSurplusKwh: z.number().nonnegative(),
  projectedDeficitKwh: z.number().nonnegative(),
  solarSufficiencyPct: z.number().min(0).max(100),
  expectedGridDependencyPct: z.number().min(0).max(100),
  highRiskHours: z.number().int().nonnegative(),
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
    weatherProvider: z.string().min(1),
    demandModelCount: z.number().int().positive(),
    solarModelCount: z.number().int().positive(),
    anomalyModelCount: z.number().int().positive(),
  }),
  data: z.object({
    metadata: datasetMetadataSchema,
    weatherSource: z.object({
      provider: z.string().min(1),
      mode: z.enum(["simulated", "api"]),
      confidence: z.number().min(0).max(1),
      note: z.string().min(1),
    }),
    demandModels: z.array(forecastModelOutputSchema).min(5),
    solarModels: z.array(forecastModelOutputSchema).min(3),
    anomalyModels: z.array(anomalyModelOutputSchema).min(3),
    sufficiency: z.object({
      hourly: z.array(sufficiencyHourlySchema).min(1),
      summary: sufficiencySummarySchema,
    }),
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

const forecastHybridComparisonSchema = z.object({
  family: z.enum(["demand", "solar"]),
  hybridModelId: z.string().min(1),
  hybridModelName: z.string().min(1),
  hybridMetrics: z.object({
    mae: z.number().nonnegative(),
    rmse: z.number().nonnegative(),
    mape: z.number().nonnegative(),
    score: z.number(),
    rank: z.number().int().positive(),
  }),
  bestBaseline: z.object({
    modelId: z.string().min(1),
    modelName: z.string().min(1),
    mae: z.number().nonnegative(),
    rmse: z.number().nonnegative(),
    mape: z.number().nonnegative(),
    score: z.number(),
    rank: z.number().int().positive(),
  }),
  averageBaseline: z.object({
    mae: z.number().nonnegative(),
    rmse: z.number().nonnegative(),
    mape: z.number().nonnegative(),
    score: z.number(),
  }),
  improvementPctVsBestBaseline: z.object({
    mae: z.number(),
    rmse: z.number(),
    mape: z.number(),
    score: z.number(),
  }),
  improvementPctVsAverageBaseline: z.object({
    mae: z.number(),
    rmse: z.number(),
    mape: z.number(),
    score: z.number(),
  }),
  isHybridWinner: z.boolean(),
})

const anomalyHybridComparisonSchema = z.object({
  hybridModelId: z.string().min(1),
  hybridModelName: z.string().min(1),
  hybridMetrics: z.object({
    precision: z.number().min(0).max(1),
    recall: z.number().min(0).max(1),
    f1: z.number().min(0).max(1),
    aurocProxy: z.number().min(0).max(1),
    score: z.number(),
    rank: z.number().int().positive(),
  }),
  bestBaseline: z.object({
    modelId: z.string().min(1),
    modelName: z.string().min(1),
    precision: z.number().min(0).max(1),
    recall: z.number().min(0).max(1),
    f1: z.number().min(0).max(1),
    aurocProxy: z.number().min(0).max(1),
    score: z.number(),
    rank: z.number().int().positive(),
  }),
  averageBaseline: z.object({
    precision: z.number().min(0).max(1),
    recall: z.number().min(0).max(1),
    f1: z.number().min(0).max(1),
    aurocProxy: z.number().min(0).max(1),
    score: z.number(),
  }),
  improvementPctVsBestBaseline: z.object({
    precision: z.number(),
    recall: z.number(),
    f1: z.number(),
    aurocProxy: z.number(),
    score: z.number(),
  }),
  improvementPctVsAverageBaseline: z.object({
    precision: z.number(),
    recall: z.number(),
    f1: z.number(),
    aurocProxy: z.number(),
    score: z.number(),
  }),
  isHybridWinner: z.boolean(),
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
    comparison: z.object({
      forecast: z.array(forecastHybridComparisonSchema),
      anomaly: z.array(anomalyHybridComparisonSchema),
    }),
  }),
})

export type EvaluationApiResponse = z.infer<typeof evaluationApiResponseSchema>

export const optimizationApiResponseSchema = z.object({
  success: z.literal(true),
  traceId: z.string().min(1),
  seed: z.number().int(),
  modelVersion: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  validationSummary: z.object({
    schemaValid: z.boolean(),
    horizonHours: z.number().int().positive(),
    policyId: z.enum(["balanced", "battery-priority", "solar-priority", "cost-shift"]),
    selectedModel: z.string().min(1),
  }),
  data: z.object({
    policy: z.object({
      policyId: z.enum(["balanced", "battery-priority", "solar-priority", "cost-shift"]),
      selectedByModelId: z.string().min(1),
      selectedByModelName: z.string().min(1),
      selectedByScore: z.number(),
      rationale: z.string().min(1),
    }),
    selectedModels: z.object({
      demandModel: z.string().min(1),
      solarModel: z.string().min(1),
      anomalyModel: z.string().min(1),
    }),
    allocations: z.array(
      z.object({
        timestamp: z.string().datetime(),
        predictedDemand: z.number().nonnegative(),
        predictedSolar: z.number().nonnegative(),
        forecastUncertainty: z.number().min(0),
        anomalyConfidence: z.number().min(0),
        safetyFallback: z.boolean(),
        solarUsed: z.number().nonnegative(),
        batteryDischarge: z.number().nonnegative(),
        batteryCharge: z.number().nonnegative(),
        gridUsed: z.number().nonnegative(),
        batterySocEnd: z.number().nonnegative(),
        tariff: z.number().positive(),
        projectedCostInr: z.number().nonnegative(),
        confidence: z.number().min(0).max(1),
      }),
    ),
    summary: z.object({
      projectedCostInr: z.number().nonnegative(),
      projectedCarbonSavedKg: z.number().nonnegative(),
      selfSufficiencyScore: z.number().min(0).max(100),
      gridDependencyPct: z.number().min(0).max(100),
      batteryCycleUtilizationPct: z.number().min(0).max(100),
      safetyFallbackHours: z.number().int().nonnegative(),
      averageForecastUncertainty: z.number().min(0),
      averageAnomalyConfidence: z.number().min(0),
    }),
    recommendations: z.array(
      z.object({
        text: z.string().min(1),
        confidence: z.number().min(0).max(1),
      }),
    ),
  }),
})

export type OptimizationApiResponse = z.infer<typeof optimizationApiResponseSchema>

export const marketApiResponseSchema = z.object({
  success: z.literal(true),
  traceId: z.string().min(1),
  seed: z.number().int(),
  modelVersion: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  validationSummary: z.object({
    schemaValid: z.boolean(),
    horizonHours: z.number().int().positive(),
    strictness: z.enum(["high", "medium", "low"]),
    dualRoleHouseholds: z.number().int().nonnegative(),
  }),
  data: z.object({
    policySignal: z.object({
      strictness: z.enum(["high", "medium", "low"]),
      selectedByModel: z.string().min(1),
      rationale: z.string().min(1),
    }),
    households: z.array(
      z.object({
        householdId: z.string().min(1),
        reliability: z.number().min(0).max(1),
        location: z.number(),
        buyerSlots: z.number().int().nonnegative(),
        sellerSlots: z.number().int().nonnegative(),
        dualRole: z.boolean(),
      }),
    ),
    trades: z.array(
      z.object({
        tradeId: z.string().min(1),
        hour: z.number().int().nonnegative(),
        sellerId: z.string().min(1),
        buyerId: z.string().min(1),
        quantityKwh: z.number().positive(),
        clearingPriceInrPerKwh: z.number().positive(),
        valueInr: z.number().positive(),
        distanceKm: z.number().nonnegative(),
        reliabilityScore: z.number().min(0).max(1),
        explanation: z.string().min(1),
      }),
    ),
    summary: z.object({
      totalMatchedKwh: z.number().nonnegative(),
      totalUnmatchedDemandKwh: z.number().nonnegative(),
      averageClearingPrice: z.number().nonnegative(),
      dualRoleHouseholds: z.number().int().nonnegative(),
      marketConfidence: z.number().min(0).max(1),
    }),
    ledger: z.array(
      z.object({
        entryId: z.string().min(1),
        tradeId: z.string().min(1),
        hour: z.number().int().nonnegative(),
        sellerId: z.string().min(1),
        buyerId: z.string().min(1),
        quantityKwh: z.number().positive(),
        priceInrPerKwh: z.number().positive(),
        status: z.literal("settled"),
      }),
    ),
  }),
})

export type MarketApiResponse = z.infer<typeof marketApiResponseSchema>
