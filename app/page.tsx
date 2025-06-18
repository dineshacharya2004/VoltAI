"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Sun, Battery, Leaf, Zap, AlertTriangle, Settings2 } from "lucide-react"
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts"
import { motion } from "framer-motion"
import { ScenarioSimulation } from "@/components/scenario-simulation"
import { ThemeToggle } from "@/components/theme-toggle"

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
