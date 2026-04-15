import { generateSyntheticDataset } from "@/lib/simulation/generate-dataset"
import { runEvaluationWorkflow } from "@/lib/simulation/evaluation"
import { createSeededRng } from "@/lib/simulation/seeded-rng"
import { runModelSimulationSuite } from "@/lib/simulation/model-simulators"
import type { ScenarioProfile, SyntheticDataset } from "@/lib/simulation/types"

type SortBy = "mae" | "rmse" | "mape" | "score"

interface OptimizationInput {
  seed: number
  scenarioProfile: ScenarioProfile
  dataset: SyntheticDataset
  months: number
  horizonHours: number
}

interface PolicySelection {
  policyId: "balanced" | "battery-priority" | "solar-priority" | "cost-shift"
  selectedByModelId: string
  selectedByModelName: string
  selectedByScore: number
  rationale: string
}

export interface OptimizationHourAllocation {
  timestamp: string
  predictedDemand: number
  predictedSolar: number
  forecastUncertainty: number
  anomalyConfidence: number
  safetyFallback: boolean
  solarUsed: number
  batteryDischarge: number
  batteryCharge: number
  gridUsed: number
  batterySocEnd: number
  tariff: number
  projectedCostInr: number
  confidence: number
}

export interface OptimizationOutput {
  policy: PolicySelection
  selectedModels: {
    demandModel: string
    solarModel: string
    anomalyModel: string
  }
  allocations: OptimizationHourAllocation[]
  summary: {
    projectedCostInr: number
    projectedCarbonSavedKg: number
    selfSufficiencyScore: number
    gridDependencyPct: number
    batteryCycleUtilizationPct: number
    safetyFallbackHours: number
    averageForecastUncertainty: number
    averageAnomalyConfidence: number
  }
  recommendations: Array<{
    text: string
    confidence: number
  }>
  assumptions: string[]
}

interface HouseholdSlotProfile {
  householdId: string
  hour: number
  demand: number
  generation: number
  net: number
  role: "buyer" | "seller" | "neutral"
  bidPrice: number
  askPrice: number
  reliability: number
  location: number
}

export interface MarketTrade {
  tradeId: string
  hour: number
  sellerId: string
  buyerId: string
  quantityKwh: number
  clearingPriceInrPerKwh: number
  valueInr: number
  distanceKm: number
  reliabilityScore: number
  explanation: string
}

export interface MarketOutput {
  policySignal: {
    strictness: "high" | "medium" | "low"
    selectedByModel: string
    rationale: string
  }
  households: Array<{
    householdId: string
    reliability: number
    location: number
    buyerSlots: number
    sellerSlots: number
    dualRole: boolean
  }>
  trades: MarketTrade[]
  summary: {
    totalMatchedKwh: number
    totalUnmatchedDemandKwh: number
    averageClearingPrice: number
    dualRoleHouseholds: number
    marketConfidence: number
  }
  ledger: Array<{
    entryId: string
    tradeId: string
    hour: number
    sellerId: string
    buyerId: string
    quantityKwh: number
    priceInrPerKwh: number
    status: "settled"
  }>
  assumptions: string[]
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function selectPolicy(scenarioProfile: ScenarioProfile, topModel: { modelId: string; modelName: string; score: number }): PolicySelection {
  if (scenarioProfile === "grid-price-spike") {
    return {
      policyId: "cost-shift",
      selectedByModelId: topModel.modelId,
      selectedByModelName: topModel.modelName,
      selectedByScore: topModel.score,
      rationale: "Top-ranked evaluation model indicates tariff-sensitive optimization; prioritizing cost-shift policy.",
    }
  }

  if (scenarioProfile === "monsoon-low-solar") {
    return {
      policyId: "battery-priority",
      selectedByModelId: topModel.modelId,
      selectedByModelName: topModel.modelName,
      selectedByScore: topModel.score,
      rationale: "Low-solar scenario plus top evaluation score favors battery reserve usage for evening reliability.",
    }
  }

  if (topModel.modelId.includes("lstm")) {
    return {
      policyId: "battery-priority",
      selectedByModelId: topModel.modelId,
      selectedByModelName: topModel.modelName,
      selectedByScore: topModel.score,
      rationale: "Temporal leader suggests strong load-shift patterns; battery-priority policy selected.",
    }
  }

  if (topModel.modelId.includes("xgboost")) {
    return {
      policyId: "cost-shift",
      selectedByModelId: topModel.modelId,
      selectedByModelName: topModel.modelName,
      selectedByScore: topModel.score,
      rationale: "Interaction-focused top model selected; cost-shift policy aligns with tariff-responsive behavior.",
    }
  }

  return {
    policyId: "balanced",
    selectedByModelId: topModel.modelId,
    selectedByModelName: topModel.modelName,
    selectedByScore: topModel.score,
    rationale: "Top evaluation model supports balanced allocation across solar, battery, and grid.",
  }
}

export function runOptimizationEngine(input: OptimizationInput): OptimizationOutput {
  const { seed, scenarioProfile, dataset, horizonHours } = input

  const evaluation = runEvaluationWorkflow({
    seed,
    scenarioProfile,
    dataset,
    horizonHours,
    sortBy: "score" as SortBy,
    ablation: {
      withoutWeather: false,
      withoutTemporal: false,
      withoutOccupancy: false,
    },
  })

  const topForecastModel = evaluation.forecastLeaderboard[0]
  const topDemandModel = evaluation.forecastLeaderboard.find((row) => row.family === "demand")
  const topSolarModel = evaluation.forecastLeaderboard.find((row) => row.family === "solar")

  const suite = runModelSimulationSuite({
    seed,
    scenarioProfile,
    dataset,
    horizonHours,
  })

  const demandModel = suite.demandModels.find((model) => model.modelId === topDemandModel?.modelId) ?? suite.demandModels[0]
  const solarModel = suite.solarModels.find((model) => model.modelId === topSolarModel?.modelId) ?? suite.solarModels[0]
  const anomalyModel =
    suite.anomalyModels.find((model) => model.modelId.includes("fused")) ??
    suite.anomalyModels.find((model) => model.modelId === evaluation.anomalyLeaderboard[0]?.modelId) ??
    suite.anomalyModels[0]

  const policy = selectPolicy(scenarioProfile, {
    modelId: topForecastModel.modelId,
    modelName: topForecastModel.modelName,
    score: topForecastModel.score,
  })

  const batteryCapacity = 10
  let batterySoc = dataset.data[Math.max(0, dataset.data.length - horizonHours - 1)]?.batterySocKwh ?? 4.5

  const allocations: OptimizationHourAllocation[] = []

  for (let i = 0; i < horizonHours; i++) {
    const demandPrediction = demandModel.predictions[i]
    const solarPrediction = solarModel.predictions[i]
    if (!demandPrediction || !solarPrediction) continue

    const idx = dataset.data.length - horizonHours + i
    const point = dataset.data[Math.max(0, idx)]
    const tariff = point?.gridTariffInrPerKwh ?? 5.5

    const demandUncertainty = Math.abs(demandPrediction.upper - demandPrediction.lower) / Math.max(0.1, demandPrediction.predicted)
    const solarUncertainty = Math.abs(solarPrediction.upper - solarPrediction.lower) / Math.max(0.1, solarPrediction.predicted)
    const forecastUncertainty = round(clamp((demandUncertainty + solarUncertainty) / 2, 0, 1.2), 3)
    const anomalyPoint = anomalyModel.scores[i]
    const anomalyConfidence = round(clamp((anomalyPoint?.score ?? 0.35) / Math.max(0.0001, anomalyModel.threshold), 0, 1.2), 3)
    const safetyFallback = forecastUncertainty >= 0.36 || anomalyConfidence >= 0.95

    let remainingDemand = demandPrediction.predicted
    const solarUsed = Math.min(remainingDemand, solarPrediction.predicted)
    remainingDemand -= solarUsed

    let batteryDischarge = 0
    const batteryDischargeLimit = safetyFallback
      ? 1.05
      : policy.policyId === "battery-priority"
        ? 2.1
        : policy.policyId === "cost-shift" && tariff >= 7
          ? 2.3
          : 1.5
    if (remainingDemand > 0) {
      batteryDischarge = Math.min(remainingDemand, batterySoc, batteryDischargeLimit)
      remainingDemand -= batteryDischarge
      batterySoc = clamp(batterySoc - batteryDischarge, 0, batteryCapacity)
    }

    const surplusSolar = Math.max(0, solarPrediction.predicted - solarUsed)
    const batteryChargeLimit = safetyFallback ? 0.95 : policy.policyId === "solar-priority" ? 2.5 : 1.8
    const batteryCharge = Math.min(surplusSolar, batteryCapacity - batterySoc, batteryChargeLimit)
    batterySoc = clamp(batterySoc + batteryCharge * 0.95, 0, batteryCapacity)

    const gridUsed = Math.max(0, remainingDemand)
    const projectedCostInr = round(gridUsed * tariff, 3)

    const confidence = round(
      clamp(
        (demandModel.confidence + solarModel.confidence) / 2 - (demandUncertainty + solarUncertainty) * 0.08 - anomalyConfidence * 0.04,
        0.5,
        0.96,
      ),
      3,
    )

    allocations.push({
      timestamp: demandPrediction.timestamp,
      predictedDemand: round(demandPrediction.predicted, 3),
      predictedSolar: round(solarPrediction.predicted, 3),
      forecastUncertainty,
      anomalyConfidence,
      safetyFallback,
      solarUsed: round(solarUsed, 3),
      batteryDischarge: round(batteryDischarge, 3),
      batteryCharge: round(batteryCharge, 3),
      gridUsed: round(gridUsed, 3),
      batterySocEnd: round(batterySoc, 3),
      tariff: round(tariff, 2),
      projectedCostInr,
      confidence,
    })
  }

  const totalDemand = allocations.reduce((sum, row) => sum + row.predictedDemand, 0)
  const totalGrid = allocations.reduce((sum, row) => sum + row.gridUsed, 0)
  const totalCost = allocations.reduce((sum, row) => sum + row.projectedCostInr, 0)
  const solarAndBatteryUsed = allocations.reduce((sum, row) => sum + row.solarUsed + row.batteryDischarge, 0)
  const carbonSaved = round(solarAndBatteryUsed * 0.82, 3)
  const selfSufficiencyScore = round(clamp(((totalDemand - totalGrid) / Math.max(0.1, totalDemand)) * 100, 0, 100), 2)
  const batteryCycles = allocations.reduce((sum, row) => sum + row.batteryDischarge + row.batteryCharge, 0) / Math.max(0.1, batteryCapacity)

  const highSolarHour = allocations
    .filter((row) => row.predictedSolar > row.predictedDemand * 1.2)
    .sort((a, b) => b.predictedSolar - a.predictedSolar)[0]
  const highTariffHour = allocations
    .filter((row) => row.tariff >= 7)
    .sort((a, b) => b.tariff - a.tariff)[0]
  const lowConfidenceHour = allocations
    .slice()
    .sort((a, b) => a.confidence - b.confidence)[0]
  const fallbackHour = allocations.find((row) => row.safetyFallback)

  const recommendations = [
    highSolarHour
      ? {
          text: `Schedule flexible appliances near ${highSolarHour.timestamp.slice(11, 16)} because projected solar surplus is high and grid usage can approach zero.`,
          confidence: highSolarHour.confidence,
        }
      : null,
    highTariffHour
      ? {
          text: `During high tariff around ${highTariffHour.timestamp.slice(11, 16)}, prioritize battery discharge to avoid expensive grid imports.`,
          confidence: highTariffHour.confidence,
        }
      : null,
    lowConfidenceHour
      ? {
          text: `Prediction uncertainty increases around ${lowConfidenceHour.timestamp.slice(11, 16)}; reserve backup battery margin and avoid optional heavy loads.`,
          confidence: lowConfidenceHour.confidence,
        }
      : null,
    fallbackHour
      ? {
          text: `Safety fallback engaged near ${fallbackHour.timestamp.slice(11, 16)} due to reliability thresholds; policy shifted to conservative dispatch mode.`,
          confidence: round(Math.max(0.5, 1 - fallbackHour.forecastUncertainty * 0.35), 3),
        }
      : null,
  ].filter((item): item is { text: string; confidence: number } => item !== null)

  const safetyFallbackHours = allocations.filter((row) => row.safetyFallback).length

  return {
    policy,
    selectedModels: {
      demandModel: demandModel.modelName,
      solarModel: solarModel.modelName,
      anomalyModel: anomalyModel.modelName,
    },
    allocations,
    summary: {
      projectedCostInr: round(totalCost, 2),
      projectedCarbonSavedKg: carbonSaved,
      selfSufficiencyScore,
      gridDependencyPct: round(clamp((totalGrid / Math.max(0.1, totalDemand)) * 100, 0, 100), 2),
      batteryCycleUtilizationPct: round(clamp((batteryCycles / horizonHours) * 100, 0, 100), 2),
      safetyFallbackHours,
      averageForecastUncertainty: round(mean(allocations.map((row) => row.forecastUncertainty)), 4),
      averageAnomalyConfidence: round(mean(allocations.map((row) => row.anomalyConfidence)), 4),
    },
    recommendations,
    assumptions: [
      "Policy selection is driven by Phase 3 composite leaderboard ranking.",
      "Battery operation approximates round-trip efficiency using fixed coefficients.",
      "Safety supervisor switches to conservative fallback when forecast uncertainty or anomaly confidence crosses deterministic thresholds.",
      "Optimization state includes forecast uncertainty and fused anomaly confidence signals.",
      "Confidence-aware recommendations are derived from interval width, anomaly confidence, and model confidence.",
    ],
  }
}

function scenarioDemandMultiplier(scenario: ScenarioProfile) {
  if (scenario === "festival-high-demand") return 1.24
  if (scenario === "monsoon-low-solar") return 1.09
  return 1
}

function scenarioSolarMultiplier(scenario: ScenarioProfile) {
  if (scenario === "monsoon-low-solar") return 0.68
  if (scenario === "festival-high-demand") return 0.9
  return 1
}

function buildHouseholdProfiles(seed: number) {
  const rng = createSeededRng(seed + 8000)
  return Array.from({ length: 10 }, (_, idx) => ({
    householdId: `H-${(idx + 1).toString().padStart(2, "0")}`,
    demandScale: round(rng.nextInRange(0.75, 1.35), 3),
    solarScale: round(rng.nextInRange(0.65, 1.4), 3),
    reliability: round(rng.nextInRange(0.72, 0.96), 3),
    location: round(rng.nextInRange(0.2, 9.8), 3),
  }))
}

function generateSlotProfiles(seed: number, scenarioProfile: ScenarioProfile, horizonHours: number): HouseholdSlotProfile[] {
  const rng = createSeededRng(seed + 8200)
  const households = buildHouseholdProfiles(seed)
  const demandScenario = scenarioDemandMultiplier(scenarioProfile)
  const solarScenario = scenarioSolarMultiplier(scenarioProfile)

  const profiles: HouseholdSlotProfile[] = []

  for (let hour = 0; hour < horizonHours; hour++) {
    const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI))
    for (const household of households) {
      const occupancyBump = hour >= 19 || hour <= 6 ? 1.15 : 0.92
      const demand =
        household.demandScale *
        demandScenario *
        occupancyBump *
        (1.6 + 0.35 * Math.sin((hour / 24) * 2 * Math.PI + household.location * 0.2))

      const generation =
        household.solarScale *
        solarScenario *
        daylight *
        (2.6 + 0.6 * Math.sin((hour / 24) * 2 * Math.PI + household.location * 0.1))

      const noise = rng.nextInRange(-0.04, 0.04)
      const demandAdj = round(Math.max(0.2, demand * (1 + noise)), 3)
      const generationAdj = round(Math.max(0, generation * (1 - noise * 0.6)), 3)
      const net = round(generationAdj - demandAdj, 3)

      const bidPrice = round(5.8 + (1 - household.reliability) * 2.2 + (hour >= 18 && hour <= 22 ? 1.2 : 0), 2)
      const askPrice = round(4.1 + (1 - household.reliability) * 1.4 + (daylight > 0.6 ? -0.2 : 0.3), 2)

      profiles.push({
        householdId: household.householdId,
        hour,
        demand: demandAdj,
        generation: generationAdj,
        net,
        role: net > 0.18 ? "seller" : net < -0.18 ? "buyer" : "neutral",
        bidPrice,
        askPrice,
        reliability: household.reliability,
        location: household.location,
      })
    }
  }

  return profiles
}

export function runMarketIntelligence({
  seed,
  scenarioProfile,
  months,
  horizonHours,
}: {
  seed: number
  scenarioProfile: ScenarioProfile
  months: number
  horizonHours: number
}): MarketOutput {
  const dataset = generateSyntheticDataset({
    seed,
    months,
    scenarioProfile,
  })

  const evaluation = runEvaluationWorkflow({
    seed,
    scenarioProfile,
    dataset,
    horizonHours,
    sortBy: "score",
    ablation: {
      withoutWeather: false,
      withoutTemporal: false,
      withoutOccupancy: false,
    },
  })

  const topModel = evaluation.forecastLeaderboard[0]
  const strictness: "high" | "medium" | "low" =
    topModel.score >= 82 ? "low" : topModel.score >= 74 ? "medium" : "high"

  const distanceLimit = strictness === "low" ? 8.5 : strictness === "medium" ? 6.8 : 5.2
  const slotProfiles = generateSlotProfiles(seed, scenarioProfile, horizonHours)
  const trades: MarketTrade[] = []
  const ledger: MarketOutput["ledger"] = []
  let totalUnmatchedDemand = 0
  let totalMatched = 0

  let tradeCounter = 1
  for (let hour = 0; hour < horizonHours; hour++) {
    const slot = slotProfiles.filter((row) => row.hour === hour)
    const sellers = slot
      .filter((row) => row.role === "seller")
      .map((row) => ({ ...row, remaining: row.net }))
      .sort((a, b) => a.askPrice - b.askPrice)
    const buyers = slot
      .filter((row) => row.role === "buyer")
      .map((row) => ({ ...row, required: Math.abs(row.net) }))
      .sort((a, b) => b.bidPrice - a.bidPrice)

    for (const buyer of buyers) {
      let required = buyer.required
      for (const seller of sellers) {
        if (required <= 0) break
        if (seller.remaining <= 0) continue
        if (seller.householdId === buyer.householdId) continue

        const distance = Math.abs(seller.location - buyer.location)
        const reliability = round((seller.reliability + buyer.reliability) / 2, 3)
        const compatiblePrice = buyer.bidPrice >= seller.askPrice
        const distanceAllowed = distance <= distanceLimit
        const reliabilityAllowed = reliability >= 0.73
        if (!compatiblePrice || !distanceAllowed || !reliabilityAllowed) {
          continue
        }

        const quantityKwh = round(Math.min(required, seller.remaining), 3)
        const clearingPrice = round(
          (buyer.bidPrice * 0.54 + seller.askPrice * 0.46) * (1 + (1 - reliability) * 0.025),
          2,
        )
        const valueInr = round(quantityKwh * clearingPrice, 2)
        const tradeId = `TR-${tradeCounter.toString().padStart(5, "0")}`

        trades.push({
          tradeId,
          hour,
          sellerId: seller.householdId,
          buyerId: buyer.householdId,
          quantityKwh,
          clearingPriceInrPerKwh: clearingPrice,
          valueInr,
          distanceKm: round(distance, 2),
          reliabilityScore: reliability,
          explanation: `Matched by AI score: bid>=ask, distance ${distance.toFixed(2)}km within ${distanceLimit.toFixed(1)}km, reliability ${reliability.toFixed(2)}.`,
        })

        ledger.push({
          entryId: `LED-${tradeCounter.toString().padStart(5, "0")}`,
          tradeId,
          hour,
          sellerId: seller.householdId,
          buyerId: buyer.householdId,
          quantityKwh,
          priceInrPerKwh: clearingPrice,
          status: "settled",
        })

        tradeCounter += 1
        required = round(required - quantityKwh, 3)
        seller.remaining = round(seller.remaining - quantityKwh, 3)
        totalMatched += quantityKwh
      }

      totalUnmatchedDemand += Math.max(0, required)
    }
  }

  const households = Array.from(new Set(slotProfiles.map((row) => row.householdId))).map((householdId) => {
    const rows = slotProfiles.filter((row) => row.householdId === householdId)
    const reliability = rows[0]?.reliability ?? 0.8
    const location = rows[0]?.location ?? 0
    const buyerSlots = rows.filter((row) => row.role === "buyer").length
    const sellerSlots = rows.filter((row) => row.role === "seller").length
    return {
      householdId,
      reliability,
      location,
      buyerSlots,
      sellerSlots,
      dualRole: buyerSlots > 0 && sellerSlots > 0,
    }
  })

  const avgPrice = mean(trades.map((trade) => trade.clearingPriceInrPerKwh))
  const dualRoleHouseholds = households.filter((row) => row.dualRole).length
  const matchedRatio = totalMatched / Math.max(0.1, totalMatched + totalUnmatchedDemand)
  const anomalyReliabilitySignal = evaluation.anomalyLeaderboard[0]?.f1 ?? 0.65
  const marketConfidence = round(clamp(matchedRatio * 0.6 + anomalyReliabilitySignal * 0.4, 0.5, 0.97), 3)

  return {
    policySignal: {
      strictness,
      selectedByModel: topModel.modelName,
      rationale: "Matching strictness is determined by Phase 3 top-model confidence score.",
    },
    households,
    trades,
    summary: {
      totalMatchedKwh: round(totalMatched, 3),
      totalUnmatchedDemandKwh: round(totalUnmatchedDemand, 3),
      averageClearingPrice: round(avgPrice, 2),
      dualRoleHouseholds,
      marketConfidence,
    },
    ledger,
    assumptions: [
      "AI-first matching uses price compatibility, distance constraints, and reliability gating.",
      "A household can be seller at solar-rich slots and buyer at demand-heavy slots.",
      "Settlement is represented as lightweight deterministic ledger entries.",
    ],
  }
}
