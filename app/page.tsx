"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Sun, Battery, Leaf, Zap, AlertTriangle, Settings2 } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, BarChart, Bar } from "recharts"
import { motion } from "framer-motion"
import { ScenarioSimulation } from "@/components/scenario-simulation"
import { ThemeToggle } from "@/components/theme-toggle"
import type { ScenarioProfile } from "@/lib/simulation/types"

interface DatasetApiPayload {
  traceId: string
  seed: number
  confidence: number
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
  validationSummary: {
    hoursGenerated: number
    anomalyCount: number
  }
}

interface ForecastApiPayload {
  traceId: string
  confidence: number
  validationSummary: {
    demandModelCount: number
    solarModelCount: number
    anomalyModelCount: number
    horizonHours: number
  }
  data: {
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
      scores: Array<{ flagged: boolean; actualLabel: string | null; score: number }>
    }>
  }
}

type EvaluationSortBy = "mae" | "rmse" | "mape" | "score"

interface EvaluationApiPayload {
  traceId: string
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
  }
}

const scenarioOptions: Array<{ value: ScenarioProfile; label: string }> = [
  { value: "normal-summer-day", label: "Normal Summer Day" },
  { value: "monsoon-low-solar", label: "Monsoon Low Solar" },
  { value: "festival-high-demand", label: "Festival High Demand" },
  { value: "grid-price-spike", label: "Grid Price Spike" },
]

// Dummy data for demonstration
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

const forecastData = {
  solar: {
    today: "18.2kWh",
    confidence: "85%",
    weather: "Partly Cloudy",
  },
  consumption: {
    today: "16.8kWh",
    confidence: "82%",
    factors: ["Weekend", "Higher Temperature"],
  },
}

const anomalies = [
  { time: "09:15", type: "Spike", description: "Unusual power spike detected in kitchen appliances." },
  { time: "14:40", type: "Efficiency Drop", description: "Solar panel efficiency decreased by 12%." },
]

const optimizationSuggestions = [
  {
    title: "Peak Hour Optimization",
    description: "Shift 2.5 kWh usage to off-peak hours",
    savings: "₹23.50",
    impact: "High"
  },
  {
    title: "Battery Storage",
    description: "Store 3.2 kWh during solar peak for evening use",
    savings: "₹18.20",
    impact: "Medium"
  }
]

export default function VoltAIDashboard() {
  const [currentTab, setCurrentTab] = useState("dashboard")
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

  const [seed, setSeed] = useState(Number.isFinite(defaultSeed) ? defaultSeed : 2026)
  const [months, setMonths] = useState(Number.isFinite(defaultMonths) ? Math.min(24, Math.max(12, defaultMonths)) : 12)
  const [scenarioProfile, setScenarioProfile] = useState<ScenarioProfile>(defaultScenario)
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
        if (!response.ok) {
          throw new Error(`Dataset request failed with status ${response.status}`)
        }
        const payload = (await response.json()) as DatasetApiPayload
        if (!cancelled) {
          setDatasetPayload(payload)
        }
      } catch {
        if (!cancelled) {
          setDatasetError("Failed to load deterministic synthetic dataset")
        }
      } finally {
        if (!cancelled) {
          setIsDatasetLoading(false)
        }
      }
    }

    loadDataset()

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
        if (!response.ok) {
          throw new Error(`Evaluation request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as EvaluationApiPayload
        if (!cancelled) {
          setEvaluationPayload(payload)
        }
      } catch {
        if (!cancelled) {
          setEvaluationError("Failed to load validation and benchmarking outputs")
        }
      } finally {
        if (!cancelled) {
          setIsEvaluationLoading(false)
        }
      }
    }

    loadEvaluation()

    return () => {
      cancelled = true
    }
  }, [seed, months, scenarioProfile, evaluationSortBy, ablation])

  useEffect(() => {
    let cancelled = false

    async function loadForecast() {
      setIsForecastLoading(true)
      setForecastError(null)
      try {
        const response = await fetch(`/api/simulate/forecast?seed=${seed}&months=${months}&scenario=${scenarioProfile}&horizonHours=24`)
        if (!response.ok) {
          throw new Error(`Forecast request failed with status ${response.status}`)
        }
        const payload = (await response.json()) as ForecastApiPayload
        if (!cancelled) {
          setForecastPayload(payload)
        }
      } catch {
        if (!cancelled) {
          setForecastError("Failed to load model simulation outputs")
        }
      } finally {
        if (!cancelled) {
          setIsForecastLoading(false)
        }
      }
    }

    loadForecast()

    return () => {
      cancelled = true
    }
  }, [seed, months, scenarioProfile])

  const phaseOneChartData = useMemo(() => {
    return datasetPayload?.data.data.slice(0, 168).map((point) => ({
      time: point.timestamp.slice(11, 16),
      demand: point.demandKwh,
      solar: point.solarKwh,
    }))
  }, [datasetPayload])

  const anomalyPreview = useMemo(() => {
    return (
      datasetPayload?.data.data
        .filter((point) => point.anomalyLabel)
        .slice(0, 6)
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

    const demand = forecastPayload.data.demandModels.map((model) => ({
      modelId: model.modelId,
      modelName: model.modelName,
      confidence: model.confidence,
      latencyMs: model.latencyMs,
      mae: mae(model.predictions),
      topFactor: model.explainability.topFactors[0]?.feature ?? "n/a",
    }))

    const solar = forecastPayload.data.solarModels.map((model) => ({
      modelId: model.modelId,
      modelName: model.modelName,
      confidence: model.confidence,
      latencyMs: model.latencyMs,
      mae: mae(model.predictions),
      topFactor: model.explainability.topFactors[0]?.feature ?? "n/a",
    }))

    const anomaly = forecastPayload.data.anomalyModels.map((model) => {
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
    })

    return { demand, solar, anomaly }
  }, [forecastPayload])

  const evaluationData = evaluationPayload?.data

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white transition-colors duration-300">
      <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div 
              initial={{ scale: 0.8, rotate: -180 }} 
              animate={{ scale: 1, rotate: 0 }} 
              transition={{ type: 'spring', stiffness: 200, damping: 20 }} 
              className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg"
            >
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
                VoltAI
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Optimizing every Watt with AI</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">System Active</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="forecast" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              AI Forecast
            </TabsTrigger>
            <TabsTrigger value="simulation" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
              Simulation
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            {/* Energy Overview */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }} 
              className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Today's Generation</CardTitle>
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

            {/* Animated Energy Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1, duration: 0.7 }}
            >
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
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="generation" 
                        stackId="1" 
                        stroke="#22c55e" 
                        fill="#22c55e" 
                        fillOpacity={0.6} 
                        name="Generation (kWh)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="consumption" 
                        stackId="2" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.6} 
                        name="Consumption (kWh)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Optimization Suggestions */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2, duration: 0.7 }}
            >
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
                    {optimizationSuggestions.map((suggestion, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * i }}
                        className="p-4 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            suggestion.impact === 'High' 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {suggestion.impact}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{suggestion.description}</p>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          Save {suggestion.savings}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Anomaly Detection */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3, duration: 0.7 }}
            >
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
                    {anomalies.length === 0 ? (
                      <div className="text-green-600 dark:text-green-400 text-center py-4">
                        ✅ No anomalies detected today. System running optimally.
                      </div>
                    ) : (
                      anomalies.map((anomaly, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ x: 40, opacity: 0 }} 
                          animate={{ x: 0, opacity: 1 }} 
                          transition={{ delay: 0.1 * i }} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
                        >
                          <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-yellow-700 dark:text-yellow-300">
                              {anomaly.type} at {anomaly.time}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {anomaly.description}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Phase 1: Deterministic Synthetic Data Lab</CardTitle>
                  <CardDescription>
                    Seed-controlled generation for reproducible demand, solar, tariff, battery, and anomaly labels.
                  </CardDescription>
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
                          if (Number.isFinite(value)) {
                            setSeed(Math.max(1, value))
                          }
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
                          if (Number.isFinite(value)) {
                            setMonths(Math.min(24, Math.max(12, value)))
                          }
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

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Trace Id</p>
                      <p className="font-semibold truncate">{datasetPayload?.traceId ?? "loading"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Hours Generated</p>
                      <p className="font-semibold">{datasetPayload?.validationSummary.hoursGenerated ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Anomalies</p>
                      <p className="font-semibold">{datasetPayload?.validationSummary.anomalyCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Simulation Confidence</p>
                      <p className="font-semibold">{datasetPayload ? `${Math.round(datasetPayload.confidence * 100)}%` : "-"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-sm font-medium mb-2">First 7 Days: Demand vs Solar (seed-locked)</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={phaseOneChartData ?? []}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="time" className="text-xs" interval={23} />
                          <YAxis className="text-xs" />
                          <Tooltip />
                          <Line type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="solar" stroke="#22c55e" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-sm font-medium mb-2">Anomaly Labels (sample)</p>
                      <div className="space-y-2 max-h-[220px] overflow-auto">
                        {anomalyPreview.length === 0 && <p className="text-sm text-gray-500">No anomalies in preview window.</p>}
                        {anomalyPreview.map((anomaly) => (
                          <div key={`${anomaly.timestamp}-${anomaly.anomalyLabel}`} className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2">
                            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">{anomaly.anomalyLabel}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{new Date(anomaly.timestamp).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isDatasetLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Generating deterministic dataset...</p>}
                  {datasetError && <p className="text-sm text-red-600 dark:text-red-300">{datasetError}</p>}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Phase 2: Model Simulation Lab</CardTitle>
                  <CardDescription>
                    Side-by-side simulators for demand, solar, and anomaly intelligence with confidence intervals and explainability.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Forecast Trace</p>
                      <p className="font-semibold truncate">{forecastPayload?.traceId ?? "loading"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Demand Models</p>
                      <p className="font-semibold">{forecastPayload?.validationSummary.demandModelCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Solar Models</p>
                      <p className="font-semibold">{forecastPayload?.validationSummary.solarModelCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">Anomaly Models</p>
                      <p className="font-semibold">{forecastPayload?.validationSummary.anomalyModelCount ?? 0}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3">Demand Forecast Simulators</p>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {modelSummaries?.demand.map((model) => (
                        <div key={model.modelId} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="font-medium text-sm mb-2">{model.modelName}</p>
                          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                            <p>Confidence: {(model.confidence * 100).toFixed(1)}%</p>
                            <p>Latency: {model.latencyMs} ms</p>
                            <p>MAE (24h): {model.mae.toFixed(3)} kWh</p>
                            <p className="truncate">Top factor: {model.topFactor}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3">Solar Forecast Simulators</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {modelSummaries?.solar.map((model) => (
                        <div key={model.modelId} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="font-medium text-sm mb-2">{model.modelName}</p>
                          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                            <p>Confidence: {(model.confidence * 100).toFixed(1)}%</p>
                            <p>Latency: {model.latencyMs} ms</p>
                            <p>MAE (24h): {model.mae.toFixed(3)} kWh</p>
                            <p className="truncate">Top factor: {model.topFactor}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-3">Anomaly Detection Simulators</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {modelSummaries?.anomaly.map((model) => (
                        <div key={model.modelId} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="font-medium text-sm mb-2">{model.modelName}</p>
                          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                            <p>Confidence: {(model.confidence * 100).toFixed(1)}%</p>
                            <p>Latency: {model.latencyMs} ms</p>
                            <p>Threshold: {model.threshold.toFixed(2)}</p>
                            <p>Flagged events: {model.flagged}</p>
                            <p>True flagged labels: {model.trueFlagged}</p>
                            <p className="truncate">Top factor: {model.topFactor}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isForecastLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Simulating model outputs...</p>}
                  {forecastError && <p className="text-sm text-red-600 dark:text-red-300">{forecastError}</p>}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Phase 3: Validation And Benchmarking Lab</CardTitle>
                  <CardDescription>
                    Holdout metrics, calibration reliability, ablation degradation, and scenario stress testing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
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
                      <span className="text-sm">Without Weather Features</span>
                      <Switch
                        checked={ablation.withoutWeather}
                        onCheckedChange={(checked) => setAblation((prev) => ({ ...prev, withoutWeather: checked }))}
                      />
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                      <span className="text-sm">Without Temporal Features</span>
                      <Switch
                        checked={ablation.withoutTemporal}
                        onCheckedChange={(checked) => setAblation((prev) => ({ ...prev, withoutTemporal: checked }))}
                      />
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                      <span className="text-sm">Without Occupancy Features</span>
                      <Switch
                        checked={ablation.withoutOccupancy}
                        onCheckedChange={(checked) => setAblation((prev) => ({ ...prev, withoutOccupancy: checked }))}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Forecast Leaderboard</p>
                    <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60">
                          <tr>
                            <th className="text-left px-3 py-2">Rank</th>
                            <th className="text-left px-3 py-2">Model</th>
                            <th className="text-left px-3 py-2">Type</th>
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
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Anomaly Leaderboard</p>
                    <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60">
                          <tr>
                            <th className="text-left px-3 py-2">Rank</th>
                            <th className="text-left px-3 py-2">Model</th>
                            <th className="text-left px-3 py-2">Precision</th>
                            <th className="text-left px-3 py-2">Recall</th>
                            <th className="text-left px-3 py-2">F1</th>
                            <th className="text-left px-3 py-2">AUROC Proxy</th>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-sm font-semibold mb-2">Calibration Reliability</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={evaluationData?.calibrationBuckets ?? []}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="bucket" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="avgConfidence" fill="#3b82f6" name="Avg Confidence" />
                          <Bar dataKey="observedError" fill="#f97316" name="Observed Error" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                      <p className="text-sm font-semibold">Scenario Stress Test Summary</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Most robust model: {evaluationData?.stressTestSummary.mostRobustModel ?? "-"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Average forecast MAE: {evaluationData ? evaluationData.stressTestSummary.averageForecastMae.toFixed(3) : "-"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Max scenario drift: {evaluationData ? evaluationData.stressTestSummary.maxScenarioDriftPct.toFixed(2) : "-"}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Robustness score: {evaluationData ? evaluationData.stressTestSummary.robustnessScore.toFixed(2) : "-"}
                      </p>
                      <div className="pt-2 space-y-1">
                        {evaluationData?.stressTestSummary.scenarioResults.map((scenarioRow) => (
                          <div key={scenarioRow.scenario} className="text-xs text-gray-600 dark:text-gray-300 flex justify-between">
                            <span>{scenarioRow.scenario}</span>
                            <span>MAE {scenarioRow.avgForecastMae.toFixed(3)} | F1 {scenarioRow.avgAnomalyF1.toFixed(3)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Ablation Delta (degradation vs baseline)</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
                        {evaluationData?.ablationDeltas.forecastDelta.map((row) => (
                          <div key={row.modelId} className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                            <span>{row.modelName}</span>
                            <span>
                              dMAE {row.maeDelta >= 0 ? "+" : ""}
                              {row.maeDelta.toFixed(3)} | dScore {row.scoreDelta >= 0 ? "+" : ""}
                              {row.scoreDelta.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1">
                        {evaluationData?.ablationDeltas.anomalyDelta.map((row) => (
                          <div key={row.modelId} className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                            <span>{row.modelName}</span>
                            <span>
                              dF1 {row.f1Delta >= 0 ? "+" : ""}
                              {row.f1Delta.toFixed(3)} | dAUROC {row.aurocDelta >= 0 ? "+" : ""}
                              {row.aurocDelta.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isEvaluationLoading && <p className="text-sm text-blue-600 dark:text-blue-300">Computing validation metrics...</p>}
                  {evaluationError && <p className="text-sm text-red-600 dark:text-red-300">{evaluationError}</p>}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }} 
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Solar Forecast */}
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
                    <div className="text-3xl font-bold">{forecastData.solar.today}</div>
                    <div className="text-gray-600 dark:text-gray-400">Predicted Generation</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">{forecastData.solar.confidence}</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="text-sm font-medium">Weather Condition</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{forecastData.solar.weather}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Peak Hour</div>
                      <div className="text-gray-600 dark:text-gray-400">12:00 PM</div>
                    </div>
                    <div>
                      <div className="font-medium">Peak Output</div>
                      <div className="text-gray-600 dark:text-gray-400">4.2 kWh</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Consumption Forecast */}
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
                    <div className="text-3xl font-bold">{forecastData.consumption.today}</div>
                    <div className="text-gray-600 dark:text-gray-400">Predicted Consumption</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">{forecastData.consumption.confidence}</span>
                    </div>
                    <Progress value={82} className="h-2" />
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <div className="text-sm font-medium">Influencing Factors</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {forecastData.consumption.factors.join(", ")}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Peak Hour</div>
                      <div className="text-gray-600 dark:text-gray-400">7:00 PM</div>
                    </div>
                    <div>
                      <div className="font-medium">Peak Usage</div>
                      <div className="text-gray-600 dark:text-gray-400">3.2 kWh</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Animated Forecast Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-xl border-0">
                <CardHeader>
                  <CardTitle>Predicted Energy Flow</CardTitle>
                  <CardDescription>Next 24h AI forecast</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={energyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="generation" 
                        stroke="#22c55e" 
                        strokeWidth={3} 
                        name="Generation (kWh)" 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="consumption" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        name="Consumption (kWh)" 
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Simulation Tab */}
          <TabsContent value="simulation" className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }}
            >
              <ScenarioSimulation />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
