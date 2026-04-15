"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Battery,
  Bot,
  FlaskConical,
  Leaf,
  Lightbulb,
  Network,
  Play,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScenarioSimulation } from "@/components/scenario-simulation"
import { ThemeToggle } from "@/components/theme-toggle"
import type { ScenarioProfile } from "@/lib/simulation/types"

type ResearchTab =
  | "dashboard"
  | "ai-forecast"
  | "simulation"
  | "forecast-lab"
  | "validation-lab"
  | "optimization-lab"
  | "market-intelligence"

type EvaluationSortBy = "mae" | "rmse" | "mape" | "score"

interface DatasetApiPayload {
  traceId: string
  seed: number
  modelVersion: string
  assumptions: string[]
  confidence: number
  validationSummary: {
    hoursGenerated: number
    anomalyCount: number
  }
  data: {
    metadata: {
      scenarioProfile: ScenarioProfile
      anomalyRate: number
      months: number
      generatedAt: string
      assumptions: string[]
    }
    data: Array<{
      timestamp: string
      demandKwh: number
      solarKwh: number
      anomalyLabel: "spike" | "drift" | "sensor_fault" | "outage_drop" | null
    }>
  }
}

interface ForecastApiPayload {
  traceId: string
  modelVersion: string
  assumptions: string[]
  confidence: number
  validationSummary: {
    demandModelCount: number
    solarModelCount: number
    anomalyModelCount: number
    horizonHours: number
    weatherProvider: string
  }
  data: {
    weatherSource: {
      provider: string
      mode: "simulated" | "api"
      confidence: number
      note: string
    }
    demandModels: Array<{
      modelId: string
      modelName: string
      confidence: number
      latencyMs: number
      explainability: {
        topFactors: Array<{ feature: string; contribution: number }>
      }
      predictions: Array<{ predicted: number; actual: number }>
    }>
    solarModels: Array<{
      modelId: string
      modelName: string
      confidence: number
      latencyMs: number
      explainability: {
        topFactors: Array<{ feature: string; contribution: number }>
      }
      predictions: Array<{ predicted: number; actual: number }>
    }>
    anomalyModels: Array<{
      modelId: string
      modelName: string
      threshold: number
      confidence: number
      latencyMs: number
      explainability: {
        topFactors: Array<{ feature: string; contribution: number }>
      }
      scores: Array<{ flagged: boolean; actualLabel: string | null; score: number; causeCandidates: string[] }>
    }>
    sufficiency: {
      hourly: Array<{
        timestamp: string
        predictedDemandKwh: number
        predictedSolarKwh: number
        netKwh: number
        classification: "surplus" | "deficit" | "balanced"
        riskLevel: "low" | "medium" | "high"
        expectedGridKwh: number
        confidence: number
        recommendedAction: string
      }>
      summary: {
        totalPredictedDemandKwh: number
        totalPredictedSolarKwh: number
        projectedSurplusKwh: number
        projectedDeficitKwh: number
        solarSufficiencyPct: number
        expectedGridDependencyPct: number
        highRiskHours: number
      }
    }
  }
}

interface EvaluationApiPayload {
  traceId: string
  modelVersion: string
  assumptions: string[]
  confidence: number
  validationSummary: {
    sortBy: EvaluationSortBy
    ablation: {
      withoutWeather: boolean
      withoutTemporal: boolean
      withoutOccupancy: boolean
    }
  }
  data: {
    forecastLeaderboard: Array<{
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
    }>
    anomalyLeaderboard: Array<{
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
    }>
    calibrationBuckets: Array<{
      bucket: string
      avgConfidence: number
      observedError: number
      modelCount: number
    }>
    ablationDeltas: {
      forecastDelta: Array<{
        modelId: string
        modelName: string
        maeDelta: number
        rmseDelta: number
        mapeDelta: number
        scoreDelta: number
      }>
      anomalyDelta: Array<{
        modelId: string
        modelName: string
        f1Delta: number
        aurocDelta: number
        scoreDelta: number
      }>
    }
    stressTestSummary: {
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
    comparison: {
      forecast: Array<{
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
      }>
      anomaly: Array<{
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
      }>
    }
  }
}

interface OptimizationApiPayload {
  traceId: string
  modelVersion: string
  assumptions: string[]
  confidence: number
  validationSummary: {
    horizonHours: number
    policyId: "balanced" | "battery-priority" | "solar-priority" | "cost-shift"
    selectedModel: string
  }
  data: {
    policy: {
      policyId: "balanced" | "battery-priority" | "solar-priority" | "cost-shift"
      selectedByModelId: string
      selectedByModelName: string
      selectedByScore: number
      rationale: string
    }
    selectedModels: {
      demandModel: string
      solarModel: string
      anomalyModel: string
    }
    allocations: Array<{
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
    }>
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
  }
}

interface MarketApiPayload {
  traceId: string
  modelVersion: string
  assumptions: string[]
  confidence: number
  validationSummary: {
    strictness: "high" | "medium" | "low"
    dualRoleHouseholds: number
    horizonHours: number
  }
  data: {
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
    trades: Array<{
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
    }>
    summary: {
      totalMatchedKwh: number
      totalUnmatchedDemandKwh: number
      averageClearingPrice: number
      dualRoleHouseholds: number
      marketConfidence: number
    }
  }
}

const scenarioOptions: Array<{ value: ScenarioProfile; label: string }> = [
  { value: "normal-summer-day", label: "Normal Summer Day" },
  { value: "monsoon-low-solar", label: "Monsoon Low Solar" },
  { value: "festival-high-demand", label: "Festival High Demand" },
  { value: "grid-price-spike", label: "Grid Price Spike" },
]

const energyData = [
  { time: "06:00", generation: 0.2, consumption: 0.8 },
  { time: "08:00", generation: 2.3, consumption: 1.2 },
  { time: "10:00", generation: 3.8, consumption: 1.5 },
  { time: "12:00", generation: 4.2, consumption: 2.1 },
  { time: "14:00", generation: 3.5, consumption: 1.8 },
  { time: "16:00", generation: 2.1, consumption: 2.5 },
  { time: "18:00", generation: 0.5, consumption: 3.2 },
  { time: "20:00", generation: 0, consumption: 2.8 },
]

const anomalies = [
  { time: "09:15", type: "Spike", description: "Unusual power spike detected in kitchen appliances." },
  { time: "14:40", type: "Efficiency Drop", description: "Solar panel efficiency decreased by 12%." },
]

const optimizationSuggestions = [
  {
    title: "Peak Hour Optimization",
    description: "Shift 2.5 kWh usage to off-peak hours",
    savings: "₹23.50",
    impact: "High",
  },
  {
    title: "Battery Storage",
    description: "Store 3.2 kWh during solar peak for evening use",
    savings: "₹18.20",
    impact: "Medium",
  },
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function VoltAIDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const defaultSeed = Number.parseInt(searchParams.get("seed") ?? "2026", 10)
  const defaultMonths = Number.parseInt(searchParams.get("months") ?? "12", 10)
  const scenarioFromQuery = searchParams.get("scenario")
  const defaultScenario =
    scenarioOptions.some((option) => option.value === scenarioFromQuery)
      ? (scenarioFromQuery as ScenarioProfile)
      : "normal-summer-day"

  const [currentTab, setCurrentTab] = useState<ResearchTab>("dashboard")
  const [seed, setSeed] = useState(Number.isFinite(defaultSeed) ? defaultSeed : 2026)
  const [months, setMonths] = useState(Number.isFinite(defaultMonths) ? Math.min(24, Math.max(12, defaultMonths)) : 12)
  const [scenarioProfile, setScenarioProfile] = useState<ScenarioProfile>(defaultScenario)
  const [isDemoRunning, setIsDemoRunning] = useState(false)

  const [datasetPayload, setDatasetPayload] = useState<DatasetApiPayload | null>(null)
  const [datasetError, setDatasetError] = useState<string | null>(null)
  const [isDatasetLoading, setIsDatasetLoading] = useState(false)

  const [forecastPayload, setForecastPayload] = useState<ForecastApiPayload | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)
  const [isForecastLoading, setIsForecastLoading] = useState(false)

  const [evaluationPayload, setEvaluationPayload] = useState<EvaluationApiPayload | null>(null)
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const [isEvaluationLoading, setIsEvaluationLoading] = useState(false)
  const [evaluationSortBy, setEvaluationSortBy] = useState<EvaluationSortBy>("score")
  const [ablation, setAblation] = useState({
    withoutWeather: false,
    withoutTemporal: false,
    withoutOccupancy: false,
  })

  const [optimizationPayload, setOptimizationPayload] = useState<OptimizationApiPayload | null>(null)
  const [optimizationError, setOptimizationError] = useState<string | null>(null)
  const [isOptimizationLoading, setIsOptimizationLoading] = useState(false)

  const [marketPayload, setMarketPayload] = useState<MarketApiPayload | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [isMarketLoading, setIsMarketLoading] = useState(false)

  const demoTokenRef = useRef(0)

  useEffect(() => {
    const query = new URLSearchParams()
    query.set("seed", String(seed))
    query.set("months", String(months))
    query.set("scenario", scenarioProfile)
    router.replace(`${pathname}?${query.toString()}`, { scroll: false })
  }, [seed, months, scenarioProfile, pathname, router])

  useEffect(() => {
    let cancelled = false

    async function loadDataset() {
      setIsDatasetLoading(true)
      setDatasetError(null)
      try {
        const response = await fetch(`/api/simulate/dataset?seed=${seed}&months=${months}&scenario=${scenarioProfile}`)
        if (!response.ok) throw new Error("dataset fetch failed")
        const payload = (await response.json()) as DatasetApiPayload
        if (!cancelled) setDatasetPayload(payload)
      } catch {
        if (!cancelled) setDatasetError("Failed to load deterministic synthetic dataset")
      } finally {
        if (!cancelled) setIsDatasetLoading(false)
      }
    }

    loadDataset()
    return () => {
      cancelled = true
    }
  }, [seed, months, scenarioProfile])

  useEffect(() => {
    let cancelled = false

    async function loadForecast() {
      setIsForecastLoading(true)
      setForecastError(null)
      try {
        const response = await fetch(`/api/simulate/forecast?seed=${seed}&months=${months}&scenario=${scenarioProfile}&horizonHours=24&weatherProvider=synthetic`)
        if (!response.ok) throw new Error("forecast fetch failed")
        const payload = (await response.json()) as ForecastApiPayload
        if (!cancelled) setForecastPayload(payload)
      } catch {
        if (!cancelled) setForecastError("Failed to load model simulation outputs")
      } finally {
        if (!cancelled) setIsForecastLoading(false)
      }
    }

    loadForecast()
    return () => {
      cancelled = true
    }
  }, [seed, months, scenarioProfile])

  useEffect(() => {
    let cancelled = false

    async function loadEvaluation() {
      setIsEvaluationLoading(true)
      setEvaluationError(null)
      try {
        const params = new URLSearchParams()
        params.set("seed", String(seed))
        params.set("months", String(months))
        params.set("scenario", scenarioProfile)
        params.set("horizonHours", "24")
        params.set("sortBy", evaluationSortBy)
        params.set("withoutWeather", String(ablation.withoutWeather))
        params.set("withoutTemporal", String(ablation.withoutTemporal))
        params.set("withoutOccupancy", String(ablation.withoutOccupancy))

        const response = await fetch(`/api/simulate/evaluation?${params.toString()}`)
        if (!response.ok) throw new Error("evaluation fetch failed")
        const payload = (await response.json()) as EvaluationApiPayload
        if (!cancelled) setEvaluationPayload(payload)
      } catch {
        if (!cancelled) setEvaluationError("Failed to load validation and benchmarking outputs")
      } finally {
        if (!cancelled) setIsEvaluationLoading(false)
      }
    }

    loadEvaluation()
    return () => {
      cancelled = true
    }
  }, [seed, months, scenarioProfile, evaluationSortBy, ablation])

  useEffect(() => {
    let cancelled = false

    async function loadOptimization() {
      setIsOptimizationLoading(true)
      setOptimizationError(null)
      try {
        const response = await fetch(`/api/simulate/optimization?seed=${seed}&months=${months}&scenario=${scenarioProfile}&horizonHours=24`)
        if (!response.ok) throw new Error("optimization fetch failed")
        const payload = (await response.json()) as OptimizationApiPayload
        if (!cancelled) setOptimizationPayload(payload)
      } catch {
        if (!cancelled) setOptimizationError("Failed to load optimization policy outputs")
      } finally {
        if (!cancelled) setIsOptimizationLoading(false)
      }
    }

    loadOptimization()
    return () => {
      cancelled = true
    }
  }, [seed, months, scenarioProfile])

  useEffect(() => {
    let cancelled = false

    async function loadMarket() {
      setIsMarketLoading(true)
      setMarketError(null)
      try {
        const response = await fetch(`/api/simulate/market?seed=${seed}&months=${months}&scenario=${scenarioProfile}&horizonHours=24`)
        if (!response.ok) throw new Error("market fetch failed")
        const payload = (await response.json()) as MarketApiPayload
        if (!cancelled) setMarketPayload(payload)
      } catch {
        if (!cancelled) setMarketError("Failed to load AI market matching outputs")
      } finally {
        if (!cancelled) setIsMarketLoading(false)
      }
    }

    loadMarket()
    return () => {
      cancelled = true
    }
  }, [seed, months, scenarioProfile])

  useEffect(() => {
    return () => {
      demoTokenRef.current += 1
    }
  }, [])

  const phaseOneChartData = useMemo(() => {
    return (
      datasetPayload?.data.data.slice(0, 168).map((point) => ({
        time: point.timestamp.slice(11, 16),
        demand: point.demandKwh,
        solar: point.solarKwh,
      })) ?? []
    )
  }, [datasetPayload])

  const anomalyPreview = useMemo(() => {
    return (
      datasetPayload?.data.data
        .filter((point) => point.anomalyLabel)
        .slice(0, 8)
        .map((point) => ({
          timestamp: point.timestamp,
          anomalyLabel: point.anomalyLabel,
        })) ?? []
    )
  }, [datasetPayload])

  const modelSummaries = useMemo(() => {
    if (!forecastPayload) return null

    const mae = (rows: Array<{ predicted: number; actual: number }>) => {
      if (!rows.length) return 0
      return rows.reduce((sum, row) => sum + Math.abs(row.predicted - row.actual), 0) / rows.length
    }

    return {
      demand: forecastPayload.data.demandModels.map((model) => ({
        modelId: model.modelId,
        modelName: model.modelName,
        confidence: model.confidence,
        latencyMs: model.latencyMs,
        mae: mae(model.predictions),
        topFactor: model.explainability.topFactors[0]?.feature ?? "n/a",
      })),
      solar: forecastPayload.data.solarModels.map((model) => ({
        modelId: model.modelId,
        modelName: model.modelName,
        confidence: model.confidence,
        latencyMs: model.latencyMs,
        mae: mae(model.predictions),
        topFactor: model.explainability.topFactors[0]?.feature ?? "n/a",
      })),
      anomaly: forecastPayload.data.anomalyModels.map((model) => {
        const flagged = model.scores.filter((score) => score.flagged).length
        const trueFlagged = model.scores.filter((score) => score.flagged && score.actualLabel !== null).length
        return {
          modelId: model.modelId,
          modelName: model.modelName,
          confidence: model.confidence,
          latencyMs: model.latencyMs,
          threshold: model.threshold,
          flagged,
          trueFlagged,
          topFactor: model.explainability.topFactors[0]?.feature ?? "n/a",
        }
      }),
    }
  }, [forecastPayload])

  const evaluationData = evaluationPayload?.data

  const phaseFourAllocationChart = useMemo(() => {
    return (
      optimizationPayload?.data.allocations.slice(0, 24).map((row) => ({
        time: row.timestamp.slice(11, 16),
        demand: row.predictedDemand,
        solar: row.predictedSolar,
        grid: row.gridUsed,
        battery: row.batteryDischarge,
      })) ?? []
    )
  }, [optimizationPayload])

  const aiForecastHourly = useMemo(() => {
    if (!forecastPayload) return energyData
    return forecastPayload.data.sufficiency.hourly.map((row) => ({
      time: row.timestamp.slice(11, 16),
      generation: row.predictedSolarKwh,
      consumption: row.predictedDemandKwh,
      riskLevel: row.riskLevel,
      expectedGridKwh: row.expectedGridKwh,
    }))
  }, [forecastPayload])

  const aiForecastSummary = useMemo(() => {
    if (!forecastPayload) {
      return {
        predictedSolar: "18.2 kWh",
        predictedDemand: "16.8 kWh",
        solarConfidence: "85%",
        demandConfidence: "82%",
        weatherNote: "Synthetic weather adapter",
        factors: ["Scenario prior", "Historical lags"],
        sufficiencyText: "Forecast data loading",
      }
    }

    const topDemand = [...forecastPayload.data.demandModels].sort((a, b) => b.confidence - a.confidence)[0]
    const topSolar = [...forecastPayload.data.solarModels].sort((a, b) => b.confidence - a.confidence)[0]
    const summary = forecastPayload.data.sufficiency.summary

    return {
      predictedSolar: `${summary.totalPredictedSolarKwh.toFixed(1)} kWh`,
      predictedDemand: `${summary.totalPredictedDemandKwh.toFixed(1)} kWh`,
      solarConfidence: `${((topSolar?.confidence ?? forecastPayload.confidence) * 100).toFixed(1)}%`,
      demandConfidence: `${((topDemand?.confidence ?? forecastPayload.confidence) * 100).toFixed(1)}%`,
      weatherNote: `${forecastPayload.data.weatherSource.provider} (${forecastPayload.data.weatherSource.mode})`,
      factors: [
        topDemand?.explainability.topFactors[0]?.feature ?? "lag_24h_demand",
        topSolar?.explainability.topFactors[0]?.feature ?? "irradiance_signal",
      ],
      sufficiencyText:
        summary.projectedDeficitKwh > 0
          ? `${summary.highRiskHours} high-risk hours; expected grid dependency ${summary.expectedGridDependencyPct.toFixed(1)}%`
          : `Solar sufficiency ${summary.solarSufficiencyPct.toFixed(1)}%; projected surplus ${summary.projectedSurplusKwh.toFixed(1)} kWh`,
    }
  }, [forecastPayload])

  const highRiskForecastRows = useMemo(
    () => forecastPayload?.data.sufficiency.hourly.filter((row) => row.riskLevel === "high").slice(0, 4) ?? [],
    [forecastPayload],
  )

  const recentTrades = useMemo(() => marketPayload?.data.trades.slice(0, 8) ?? [], [marketPayload])

  const dualRoleProofRows = useMemo(
    () => marketPayload?.data.households.filter((household) => household.dualRole).slice(0, 6) ?? [],
    [marketPayload],
  )

  async function runScriptedDemo() {
    if (isDemoRunning) return

    setIsDemoRunning(true)
    const currentToken = demoTokenRef.current + 1
    demoTokenRef.current = currentToken

    const steps: Array<{ tab: ResearchTab; seedValue: number; scenario: ScenarioProfile; delayMs: number }> = [
      { tab: "forecast-lab", seedValue: 2026, scenario: "normal-summer-day", delayMs: 1200 },
      { tab: "validation-lab", seedValue: 2026, scenario: "monsoon-low-solar", delayMs: 1400 },
      { tab: "optimization-lab", seedValue: 2042, scenario: "grid-price-spike", delayMs: 1500 },
      { tab: "market-intelligence", seedValue: 2042, scenario: "festival-high-demand", delayMs: 1700 },
    ]

    for (const step of steps) {
      if (demoTokenRef.current !== currentToken) {
        setIsDemoRunning(false)
        return
      }
      setCurrentTab(step.tab)
      setSeed(step.seedValue)
      setMonths(12)
      setScenarioProfile(step.scenario)
      await wait(step.delayMs)
    }

    if (demoTokenRef.current === currentToken) {
      setIsDemoRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white transition-colors duration-300">
      <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <motion.div
              initial={{ scale: 0.9, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg"
            >
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
                VoltAI Research Demo
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Deterministic AI simulation for forecasting, validation, optimization, and prosumer intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runScriptedDemo}
              disabled={isDemoRunning}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-3 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
            >
              <Play className="h-4 w-4" />
              {isDemoRunning ? "Demo In Progress" : "Run Scripted Demo"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as ResearchTab)} className="space-y-6">
          <TabsList className="flex flex-wrap bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm gap-1 h-auto p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="ai-forecast" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              AI Forecast
            </TabsTrigger>
            <TabsTrigger value="simulation" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Simulation
            </TabsTrigger>
            <TabsTrigger value="forecast-lab" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Forecast Lab
            </TabsTrigger>
            <TabsTrigger value="validation-lab" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Validation Lab
            </TabsTrigger>
            <TabsTrigger value="optimization-lab" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Optimization Lab
            </TabsTrigger>
            <TabsTrigger value="market-intelligence" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Market Intelligence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Today&apos;s Generation</CardTitle>
                  <Sun className="h-5 w-5 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">18.2 kWh</div>
                  <p className="text-xs text-green-600 dark:text-green-400">+12% from yesterday</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Consumption</CardTitle>
                  <Battery className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">12.5 kWh</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">5.7 kWh surplus</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Grid Dependency</CardTitle>
                  <Zap className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">-35%</div>
                  <p className="text-xs text-green-600 dark:text-green-400">vs last week</p>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Carbon Saved</CardTitle>
                  <Leaf className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">14.5 kg</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">CO2 offset today</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Energy Flow Today</CardTitle>
                  <CardDescription>Real-time generation vs consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={energyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Area type="monotone" dataKey="generation" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Generation (kWh)" />
                      <Area type="monotone" dataKey="consumption" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Consumption (kWh)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
              <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-blue-500" />
                    AI Optimization Suggestions
                  </CardTitle>
                  <CardDescription>Smart recommendations to improve your energy efficiency</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {optimizationSuggestions.map((suggestion) => (
                      <div key={suggestion.title} className="p-4 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              suggestion.impact === "High"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                            }`}
                          >
                            {suggestion.impact}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{suggestion.description}</p>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">Save {suggestion.savings}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}>
              <Card className="bg-gradient-to-r from-red-50 to-yellow-50 dark:from-red-900/20 dark:to-yellow-900/20 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />
                    Anomaly Detection
                  </CardTitle>
                  <CardDescription>AI-detected power spikes and efficiency issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {anomalies.map((anomaly) => (
                      <div key={`${anomaly.time}-${anomaly.type}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-yellow-700 dark:text-yellow-300">
                            {anomaly.type} at {anomaly.time}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{anomaly.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="ai-forecast" className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sun className="w-5 h-5 mr-2 text-yellow-500" />
                    Solar Generation Forecast
                  </CardTitle>
                  <CardDescription>AI-powered prediction for tomorrow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{aiForecastSummary.predictedSolar}</div>
                    <div className="text-gray-600 dark:text-gray-400">Predicted Generation</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">{aiForecastSummary.solarConfidence}</span>
                    </div>
                    <Progress value={Number.parseFloat(aiForecastSummary.solarConfidence)} className="h-2" />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="text-sm font-medium">Weather Source</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{aiForecastSummary.weatherNote}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Battery className="w-5 h-5 mr-2 text-blue-500" />
                    Consumption Forecast
                  </CardTitle>
                  <CardDescription>Predicted energy usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{aiForecastSummary.predictedDemand}</div>
                    <div className="text-gray-600 dark:text-gray-400">Predicted Consumption</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">{aiForecastSummary.demandConfidence}</span>
                    </div>
                    <Progress value={Number.parseFloat(aiForecastSummary.demandConfidence)} className="h-2" />
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <div className="text-sm font-medium">Influencing Factors</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{aiForecastSummary.factors.join(", ")}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.55 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Solar Sufficiency Risk</CardTitle>
                  <CardDescription>Demand-solar sufficiency intelligence with grid risk classification and actions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">{aiForecastSummary.sufficiencyText}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {highRiskForecastRows.length === 0 && <p className="text-xs text-gray-500">No high-risk deficit hours for this scenario.</p>}
                    {highRiskForecastRows.map((row) => (
                      <div key={row.timestamp} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 text-xs">
                        <p className="font-medium">{row.timestamp.slice(11, 16)}: {row.classification}</p>
                        <p>Expected grid: {row.expectedGridKwh.toFixed(2)} kWh</p>
                        <p>{row.recommendedAction}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Predicted Energy Flow</CardTitle>
                  <CardDescription>Next 24h AI forecast</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={aiForecastHourly}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="generation" stroke="#22c55e" strokeWidth={3} name="Generation (kWh)" dot={false} />
                      <Line type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={3} name="Consumption (kWh)" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="simulation" className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <ScenarioSimulation />
            </motion.div>
          </TabsContent>

          <TabsContent value="forecast-lab" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Research Controls And Traceability</CardTitle>
                  <CardDescription>All outputs are deterministic under fixed seed and scenario profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Seed</p>
                      <Input
                        type="number"
                        min={1}
                        value={seed}
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value || "0", 10)
                          if (Number.isFinite(value)) setSeed(Math.max(1, value))
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Months</p>
                      <Input
                        type="number"
                        min={12}
                        max={24}
                        value={months}
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value || "12", 10)
                          if (Number.isFinite(value)) setMonths(Math.min(24, Math.max(12, value)))
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Scenario Preset</p>
                      <Select value={scenarioProfile} onValueChange={(value) => setScenarioProfile(value as ScenarioProfile)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scenarioOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Dataset Trace</p>
                      <p className="font-semibold truncate">{datasetPayload?.traceId ?? "loading"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Dataset Version</p>
                      <p className="font-semibold truncate">{datasetPayload?.modelVersion ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Hours Generated</p>
                      <p className="font-semibold">{datasetPayload?.validationSummary.hoursGenerated ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Anomaly Labels</p>
                      <p className="font-semibold">{datasetPayload?.validationSummary.anomalyCount ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="xl:col-span-2">
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle>Forecast Lab: Synthetic Signal Generation</CardTitle>
                    <CardDescription>First seven days of demand and solar under fixed seed.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={phaseOneChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="time" className="text-xs" interval={23} />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Line type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="solar" stroke="#22c55e" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.56 }}>
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Anomaly Preview
                    </CardTitle>
                    <CardDescription>Label samples for explainable anomaly benchmarking.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[300px] overflow-auto">
                    {anomalyPreview.length === 0 && <p className="text-sm text-gray-500">No anomalies in preview window.</p>}
                    {anomalyPreview.map((anomaly) => (
                      <div key={`${anomaly.timestamp}-${anomaly.anomalyLabel}`} className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2">
                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">{anomaly.anomalyLabel}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">{new Date(anomaly.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Innovation Highlights</CardTitle>
                  <CardDescription>Conference-facing novelty points for technical reviewers.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-start gap-3">
                    <Bot className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Multi-model simulation suite</p>
                      <p className="text-gray-600 dark:text-gray-300">Parallel demand, solar, and anomaly simulators with ranked comparisons and latency profiles.</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Uncertainty-aware scheduling</p>
                      <p className="text-gray-600 dark:text-gray-300">Policy recommendations account for confidence intervals and low-certainty windows.</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Explainable recommendations</p>
                      <p className="text-gray-600 dark:text-gray-300">Top influencing factors and scenario rationale are attached to model outputs and controls.</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-start gap-3">
                    <Network className="h-5 w-5 text-violet-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Dual-role prosumer logic</p>
                      <p className="text-gray-600 dark:text-gray-300">Same household can be buyer and seller in different time slots under AI matching constraints.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-blue-600" />
                    Research Methodology
                  </CardTitle>
                  <CardDescription>Transparent simulation protocol for reproducibility and defensibility.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
                  <p>
                    Synthetic protocol: hourly household-level energy records are generated from seeded stochastic profiles, scenario multipliers, and deterministic anomaly injections over 12 to 24 month windows.
                  </p>
                  <p>
                    Assumptions: no private user data, no real model training, fixed proxy equations for confidence and uncertainty behavior, and deterministic policy selection from evaluation leaderboards.
                  </p>
                  <p>
                    Limitations: synthetic dynamics cannot fully represent policy shocks, sensor drift complexity, or regional weather extremes seen in real deployments.
                  </p>
                  <p>
                    Future real-data path: integrate utility smart-meter streams, weather APIs, and human-in-the-loop labels while preserving the same evaluation contracts and traceability schema.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Model Comparison Snapshot</CardTitle>
                  <CardDescription>Phase 2 simulators with explainability and confidence surface.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-sm font-semibold mb-2">Demand Simulators</p>
                    <div className="space-y-2 text-xs">
                      {modelSummaries?.demand.map((model) => (
                        <div key={model.modelId} className="rounded-md bg-gray-50 dark:bg-gray-800/60 p-2">
                          <p className="font-medium">{model.modelName}</p>
                          <p>MAE: {model.mae.toFixed(3)} kWh</p>
                          <p>Confidence: {(model.confidence * 100).toFixed(1)}%</p>
                          <p>Top factor: {model.topFactor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-sm font-semibold mb-2">Solar Simulators</p>
                    <div className="space-y-2 text-xs">
                      {modelSummaries?.solar.map((model) => (
                        <div key={model.modelId} className="rounded-md bg-gray-50 dark:bg-gray-800/60 p-2">
                          <p className="font-medium">{model.modelName}</p>
                          <p>MAE: {model.mae.toFixed(3)} kWh</p>
                          <p>Confidence: {(model.confidence * 100).toFixed(1)}%</p>
                          <p>Top factor: {model.topFactor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-sm font-semibold mb-2">Anomaly Simulators</p>
                    <div className="space-y-2 text-xs">
                      {modelSummaries?.anomaly.map((model) => (
                        <div key={model.modelId} className="rounded-md bg-gray-50 dark:bg-gray-800/60 p-2">
                          <p className="font-medium">{model.modelName}</p>
                          <p>Threshold: {model.threshold.toFixed(2)}</p>
                          <p>Flagged: {model.flagged}</p>
                          <p>True labels: {model.trueFlagged}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {isDatasetLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Generating deterministic dataset...</p>}
            {datasetError && <p className="text-sm text-red-600 dark:text-red-300">{datasetError}</p>}
            {isForecastLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Simulating model outputs...</p>}
            {forecastError && <p className="text-sm text-red-600 dark:text-red-300">{forecastError}</p>}
          </TabsContent>

          <TabsContent value="validation-lab" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Validation Lab Controls</CardTitle>
                  <CardDescription>Choose ranking metric and run deterministic ablation studies.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Sort Leaderboard By</p>
                      <Select value={evaluationSortBy} onValueChange={(value) => setEvaluationSortBy(value as EvaluationSortBy)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score">Composite Score</SelectItem>
                          <SelectItem value="mae">MAE</SelectItem>
                          <SelectItem value="rmse">RMSE</SelectItem>
                          <SelectItem value="mape">MAPE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                      <span className="text-sm">Without Weather</span>
                      <Switch checked={ablation.withoutWeather} onCheckedChange={(checked) => setAblation((prev) => ({ ...prev, withoutWeather: checked }))} />
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                      <span className="text-sm">Without Temporal</span>
                      <Switch checked={ablation.withoutTemporal} onCheckedChange={(checked) => setAblation((prev) => ({ ...prev, withoutTemporal: checked }))} />
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                      <span className="text-sm">Without Occupancy</span>
                      <Switch checked={ablation.withoutOccupancy} onCheckedChange={(checked) => setAblation((prev) => ({ ...prev, withoutOccupancy: checked }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Evaluation Trace</p>
                      <p className="font-semibold truncate">{evaluationPayload?.traceId ?? "loading"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Model Version</p>
                      <p className="font-semibold truncate">{evaluationPayload?.modelVersion ?? "-"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Validation Confidence</p>
                      <p className="font-semibold">{evaluationPayload ? `${(evaluationPayload.confidence * 100).toFixed(1)}%` : "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Forecast Leaderboard</CardTitle>
                  <CardDescription>Defensible model ranking with MAE, RMSE, MAPE, and composite score.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/60">
                      <tr>
                        <th className="text-left px-3 py-2">Rank</th>
                        <th className="text-left px-3 py-2">Model</th>
                        <th className="text-left px-3 py-2">Family</th>
                        <th className="text-left px-3 py-2">MAE</th>
                        <th className="text-left px-3 py-2">RMSE</th>
                        <th className="text-left px-3 py-2">MAPE</th>
                        <th className="text-left px-3 py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluationData?.forecastLeaderboard.map((row) => (
                        <tr key={row.modelId} className={row.rank === 1 ? "bg-green-50 dark:bg-green-900/20" : ""}>
                          <td className="px-3 py-2 font-medium">{row.rank}</td>
                          <td className="px-3 py-2">{row.modelName}</td>
                          <td className="px-3 py-2 capitalize">{row.family}</td>
                          <td className="px-3 py-2">{row.mae.toFixed(3)}</td>
                          <td className="px-3 py-2">{row.rmse.toFixed(3)}</td>
                          <td className="px-3 py-2">{row.mape.toFixed(2)}%</td>
                          <td className="px-3 py-2">{row.score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Who Buys If Everyone Can Sell?</CardTitle>
                  <CardDescription>
                    Energy is fungible across time and price: participants switch roles by hour, tariff, and reliability windows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    In VoltAI, the same home can sell during high-solar midday slots and buy during evening peak demand slots.
                    Market role is slot-specific, not identity-fixed.
                  </p>
                  <p>
                    Aggregate evidence: dual-role households {marketPayload?.validationSummary.dualRoleHouseholds ?? 0}, matched energy {marketPayload ? `${marketPayload.data.summary.totalMatchedKwh.toFixed(2)} kWh` : "-"}, unmatched demand {marketPayload ? `${marketPayload.data.summary.totalUnmatchedDemandKwh.toFixed(2)} kWh` : "-"}.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Hybrid vs Traditional Gains</CardTitle>
                  <CardDescription>Stacked and fused models benchmarked against single-model baselines.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                    <p className="font-semibold">Forecast Hybrid Comparison</p>
                    {(evaluationData?.comparison.forecast ?? []).map((item) => (
                      <div key={item.hybridModelId} className="rounded-md bg-gray-50 dark:bg-gray-800/60 p-2 text-xs space-y-1">
                        <p className="font-medium">{item.family.toUpperCase()}: {item.hybridModelName}</p>
                        <p>
                          RMSE gain vs best baseline: {item.improvementPctVsBestBaseline.rmse >= 0 ? "+" : ""}
                          {item.improvementPctVsBestBaseline.rmse.toFixed(2)}% {item.isHybridWinner ? "(Hybrid winner)" : ""}
                        </p>
                        <p>
                          MAE gain vs average baseline: {item.improvementPctVsAverageBaseline.mae >= 0 ? "+" : ""}
                          {item.improvementPctVsAverageBaseline.mae.toFixed(2)}%
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                          Hybrid {item.family} model reduces RMSE by {item.improvementPctVsBestBaseline.rmse.toFixed(2)}% vs best single-model baseline.
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                    <p className="font-semibold">Anomaly Hybrid Comparison</p>
                    {(evaluationData?.comparison.anomaly ?? []).map((item) => (
                      <div key={item.hybridModelId} className="rounded-md bg-gray-50 dark:bg-gray-800/60 p-2 text-xs space-y-1">
                        <p className="font-medium">{item.hybridModelName}</p>
                        <p>
                          F1 gain vs best baseline: {item.improvementPctVsBestBaseline.f1 >= 0 ? "+" : ""}
                          {item.improvementPctVsBestBaseline.f1.toFixed(2)}% {item.isHybridWinner ? "(Hybrid winner)" : ""}
                        </p>
                        <p>
                          AUROC gain vs average baseline: {item.improvementPctVsAverageBaseline.aurocProxy >= 0 ? "+" : ""}
                          {item.improvementPctVsAverageBaseline.aurocProxy.toFixed(2)}%
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                          Fused anomaly model improves F1 by {item.improvementPctVsBestBaseline.f1.toFixed(2)}% compared with the strongest traditional detector.
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.56 }}>
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle>Anomaly Benchmarking</CardTitle>
                    <CardDescription>Precision, recall, F1, and AUROC proxy for reviewer-facing anomaly defensibility.</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <th className="text-left px-3 py-2">Rank</th>
                          <th className="text-left px-3 py-2">Model</th>
                          <th className="text-left px-3 py-2">Precision</th>
                          <th className="text-left px-3 py-2">Recall</th>
                          <th className="text-left px-3 py-2">F1</th>
                          <th className="text-left px-3 py-2">AUROC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluationData?.anomalyLeaderboard.map((row) => (
                          <tr key={row.modelId} className={row.rank === 1 ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                            <td className="px-3 py-2 font-medium">{row.rank}</td>
                            <td className="px-3 py-2">{row.modelName}</td>
                            <td className="px-3 py-2">{row.precision.toFixed(3)}</td>
                            <td className="px-3 py-2">{row.recall.toFixed(3)}</td>
                            <td className="px-3 py-2">{row.f1.toFixed(3)}</td>
                            <td className="px-3 py-2">{row.aurocProxy.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.62 }}>
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle>Calibration Reliability</CardTitle>
                    <CardDescription>Confidence to observed error calibration buckets.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={evaluationData?.calibrationBuckets ?? []}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="bucket" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="avgConfidence" fill="#3b82f6" name="Avg Confidence" />
                        <Bar dataKey="observedError" fill="#f97316" name="Observed Error" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.68 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Ablation And Stress Evidence</CardTitle>
                  <CardDescription>Clear degradation signatures and scenario robustness summary.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                    <p className="font-semibold">Stress Summary</p>
                    <p>Most robust model: {evaluationData?.stressTestSummary.mostRobustModel ?? "-"}</p>
                    <p>Average forecast MAE: {evaluationData ? evaluationData.stressTestSummary.averageForecastMae.toFixed(3) : "-"}</p>
                    <p>Max scenario drift: {evaluationData ? `${evaluationData.stressTestSummary.maxScenarioDriftPct.toFixed(2)}%` : "-"}</p>
                    <p>Robustness score: {evaluationData ? evaluationData.stressTestSummary.robustnessScore.toFixed(2) : "-"}</p>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1 text-xs">
                    <p className="font-semibold text-sm mb-1">Forecast Ablation Delta</p>
                    {evaluationData?.ablationDeltas.forecastDelta.map((row) => (
                      <div key={row.modelId} className="flex justify-between gap-2">
                        <span>{row.modelName}</span>
                        <span>
                          dMAE {row.maeDelta >= 0 ? "+" : ""}
                          {row.maeDelta.toFixed(3)} | dScore {row.scoreDelta >= 0 ? "+" : ""}
                          {row.scoreDelta.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1 text-xs">
                    <p className="font-semibold text-sm mb-1">Anomaly Ablation Delta</p>
                    {evaluationData?.ablationDeltas.anomalyDelta.map((row) => (
                      <div key={row.modelId} className="flex justify-between gap-2">
                        <span>{row.modelName}</span>
                        <span>
                          dF1 {row.f1Delta >= 0 ? "+" : ""}
                          {row.f1Delta.toFixed(3)} | dAUROC {row.aurocDelta >= 0 ? "+" : ""}
                          {row.aurocDelta.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {isEvaluationLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Computing validation metrics...</p>}
            {evaluationError && <p className="text-sm text-red-600 dark:text-red-300">{evaluationError}</p>}
          </TabsContent>

          <TabsContent value="optimization-lab" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-blue-500" />
                    Optimization Lab
                  </CardTitle>
                  <CardDescription>Uncertainty-aware scheduling with evaluation-ranked policy signal.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Optimization Trace</p>
                    <p className="font-semibold truncate">{optimizationPayload?.traceId ?? "loading"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Model Version</p>
                    <p className="font-semibold truncate">{optimizationPayload?.modelVersion ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Policy</p>
                    <p className="font-semibold capitalize">{optimizationPayload?.data.policy.policyId ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Confidence</p>
                    <p className="font-semibold">{optimizationPayload ? `${(optimizationPayload.confidence * 100).toFixed(1)}%` : "-"}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52 }}>
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle>24h Allocation Mix</CardTitle>
                    <CardDescription>Demand served by solar, battery, and grid.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={phaseFourAllocationChart}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Area type="monotone" dataKey="solar" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.55} name="Solar" />
                        <Area type="monotone" dataKey="battery" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.45} name="Battery" />
                        <Area type="monotone" dataKey="grid" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} name="Grid" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.58 }}>
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle>Optimization Summary</CardTitle>
                    <CardDescription>Scenario-sensitive control outcomes and explainable rationale.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p>Projected Cost</p>
                        <p className="font-semibold">₹{optimizationPayload?.data.summary.projectedCostInr.toFixed(2) ?? "-"}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p>Grid Dependency</p>
                        <p className="font-semibold">{optimizationPayload ? `${optimizationPayload.data.summary.gridDependencyPct.toFixed(2)}%` : "-"}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p>Self Sufficiency</p>
                        <p className="font-semibold">{optimizationPayload ? `${optimizationPayload.data.summary.selfSufficiencyScore.toFixed(2)}%` : "-"}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
                        <p>Carbon Saved</p>
                        <p className="font-semibold">{optimizationPayload ? `${optimizationPayload.data.summary.projectedCarbonSavedKg.toFixed(2)} kg` : "-"}</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 p-3">
                      <p className="font-semibold mb-1">Policy Rationale</p>
                      <p>{optimizationPayload?.data.policy.rationale ?? "-"}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 p-3 text-xs space-y-1">
                      <p className="font-semibold text-sm mb-1">Reliability State Signals</p>
                      <p>Forecast uncertainty (avg): {optimizationPayload ? optimizationPayload.data.summary.averageForecastUncertainty.toFixed(3) : "-"}</p>
                      <p>Anomaly confidence (avg): {optimizationPayload ? optimizationPayload.data.summary.averageAnomalyConfidence.toFixed(3) : "-"}</p>
                      <p>Safety fallback hours: {optimizationPayload?.data.summary.safetyFallbackHours ?? "-"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold">Explainable Recommendations</p>
                      {(optimizationPayload?.data.recommendations ?? []).map((rec, idx) => (
                        <div key={`${rec.text}-${idx}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 flex justify-between gap-2 text-xs">
                          <span>{rec.text}</span>
                          <span className="font-medium whitespace-nowrap">{(rec.confidence * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {isOptimizationLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Computing optimization controls...</p>}
            {optimizationError && <p className="text-sm text-red-600 dark:text-red-300">{optimizationError}</p>}
          </TabsContent>

          <TabsContent value="market-intelligence" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500" />
                    Market Intelligence
                  </CardTitle>
                  <CardDescription>
                    AI-first peer matching across price, distance, and reliability; blockchain is an optional settlement layer only.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Market Trace</p>
                    <p className="font-semibold truncate">{marketPayload?.traceId ?? "loading"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Model Version</p>
                    <p className="font-semibold truncate">{marketPayload?.modelVersion ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Matching Strictness</p>
                    <p className="font-semibold capitalize">{marketPayload?.validationSummary.strictness ?? "-"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Matched Energy</p>
                    <p className="font-semibold">{marketPayload ? `${marketPayload.data.summary.totalMatchedKwh.toFixed(2)} kWh` : "-"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-gray-500 dark:text-gray-400">Unmatched Demand</p>
                    <p className="font-semibold">{marketPayload ? `${marketPayload.data.summary.totalUnmatchedDemandKwh.toFixed(2)} kWh` : "-"}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.53 }}>
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle>Dual-role Prosumer Proof</CardTitle>
                    <CardDescription>Same participants acting as buyers and sellers across different hours.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 p-3 text-sm">
                      <p>Dual-role households detected: {marketPayload?.validationSummary.dualRoleHouseholds ?? 0}</p>
                      <p>Policy rationale: {marketPayload?.data.policySignal.rationale ?? "-"}</p>
                    </div>
                    <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60">
                          <tr>
                            <th className="text-left px-3 py-2">Household</th>
                            <th className="text-left px-3 py-2">Buyer Slots</th>
                            <th className="text-left px-3 py-2">Seller Slots</th>
                            <th className="text-left px-3 py-2">Reliability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dualRoleProofRows.map((row) => (
                            <tr key={row.householdId}>
                              <td className="px-3 py-2 font-medium">{row.householdId}</td>
                              <td className="px-3 py-2">{row.buyerSlots}</td>
                              <td className="px-3 py-2">{row.sellerSlots}</td>
                              <td className="px-3 py-2">{(row.reliability * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 h-full">
                  <CardHeader>
                    <CardTitle>Trade Evidence Snapshot</CardTitle>
                    <CardDescription>AI matching decisions with value, distance, and reliability scores.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[350px] overflow-auto">
                    {recentTrades.length === 0 && <p className="text-sm text-gray-500">No trades available for this configuration.</p>}
                    {recentTrades.map((trade) => (
                      <div key={trade.tradeId} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 text-xs">
                        <p className="font-medium">
                          {trade.tradeId}: {trade.sellerId} {"->"} {trade.buyerId}
                        </p>
                        <p>
                          {trade.quantityKwh.toFixed(2)} kWh at ₹{trade.clearingPriceInrPerKwh.toFixed(2)} per kWh | {trade.distanceKm.toFixed(2)} km | reliability {(trade.reliabilityScore * 100).toFixed(1)}%
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">{trade.explanation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {isMarketLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Computing AI market matching...</p>}
            {marketError && <p className="text-sm text-red-600 dark:text-red-300">{marketError}</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
