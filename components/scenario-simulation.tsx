"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Thermometer, 
  Zap, 
  Sun, 
  CloudRain, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  Settings
} from "lucide-react"
import { motion } from "framer-motion"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"

interface SimulationParams {
  temperature: number
  applianceUsage: number
  solarAngle: number
  weatherCondition: string
}

interface Prediction {
  generation: number
  consumption: number
  efficiency: number
  cost: number
  carbonSaved: number
  confidence: number
}

const weatherOptions = [
  { value: "sunny", label: "Sunny", icon: "☀️", multiplier: 1.2 },
  { value: "partly-cloudy", label: "Partly Cloudy", icon: "⛅", multiplier: 1.0 },
  { value: "cloudy", label: "Cloudy", icon: "☁️", multiplier: 0.7 },
  { value: "rainy", label: "Rainy", icon: "🌧️", multiplier: 0.4 }
]

// Simulate AI predictions based on parameters
function calculatePredictions(params: SimulationParams): Prediction {
  const weather = weatherOptions.find(w => w.value === params.weatherCondition) || weatherOptions[1]
  
  // Solar generation calculation
  const baseGeneration = 20
  const angleEfficiency = 0.7 + (params.solarAngle / 100) * 0.3 // 70% to 100% based on angle
  const weatherMultiplier = weather.multiplier
  const generation = baseGeneration * angleEfficiency * weatherMultiplier
  
  // Consumption calculation
  const baseConsumption = 15
  const tempFactor = 1 + Math.abs(params.temperature - 22) * 0.02 // Ideal temp is 22°C
  const applianceFactor = 0.5 + (params.applianceUsage / 100) * 0.8 // 50% to 130% usage
  const consumption = baseConsumption * tempFactor * applianceFactor
  
  // Efficiency and other metrics
  const efficiency = Math.min(100, (generation / consumption) * 100)
  const cost = Math.max(0, (consumption - generation) * 5.2) // Grid cost per kWh
  const carbonSaved = generation * 0.85 // kg CO2 per kWh from solar
  const confidence = 85 + Math.random() * 10 // 85-95% confidence
  
  return {
    generation: Math.round(generation * 10) / 10,
    consumption: Math.round(consumption * 10) / 10,
    efficiency: Math.round(efficiency),
    cost: Math.round(cost * 100) / 100,
    carbonSaved: Math.round(carbonSaved * 10) / 10,
    confidence: Math.round(confidence)
  }
}

// Generate hourly data for chart
function generateHourlyData(params: SimulationParams) {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i
    const hourParams = {
      ...params,
      solarAngle: params.solarAngle * Math.max(0, Math.sin((hour - 6) * Math.PI / 12)) // Solar curve
    }
    const prediction = calculatePredictions(hourParams)
    
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      generation: prediction.generation * Math.max(0, Math.sin((hour - 6) * Math.PI / 12)),
      consumption: prediction.consumption * (0.8 + Math.random() * 0.4)
    }
  })
  
  return hours
}

export function ScenarioSimulation() {
  const [params, setParams] = useState<SimulationParams>({
    temperature: 25,
    applianceUsage: 70,
    solarAngle: 85,
    weatherCondition: "partly-cloudy"
  })
  
  const [prediction, setPrediction] = useState<Prediction>(() => calculatePredictions(params))
  const [hourlyData, setHourlyData] = useState(() => generateHourlyData(params))
  const [isCalculating, setIsCalculating] = useState(false)

  // Recalculate predictions when parameters change
  useEffect(() => {
    setIsCalculating(true)
    const timer = setTimeout(() => {
      const newPrediction = calculatePredictions(params)
      const newHourlyData = generateHourlyData(params)
      setPrediction(newPrediction)
      setHourlyData(newHourlyData)
      setIsCalculating(false)
    }, 300) // Simulate AI calculation time

    return () => clearTimeout(timer)
  }, [params])

  const resetToDefaults = () => {
    setParams({
      temperature: 25,
      applianceUsage: 70,
      solarAngle: 85,
      weatherCondition: "partly-cloudy"
    })
  }

  const currentWeather = weatherOptions.find(w => w.value === params.weatherCondition)
  const surplus = prediction.generation - prediction.consumption

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-xl font-bold">Scenario Simulation</h2>
            <p className="text-sm text-gray-400">Adjust parameters to see AI predictions</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefaults}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gray-900/80 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Simulation Parameters
              </CardTitle>
              <CardDescription>Adjust conditions to see impact on energy predictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-red-400" />
                    <span className="font-medium">Temperature</span>
                  </div>
                  <Badge variant="secondary">{params.temperature}°C</Badge>
                </div>
                <Slider
                  value={[params.temperature]}
                  onValueChange={([value]) => setParams(prev => ({ ...prev, temperature: value }))}
                  min={10}
                  max={40}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>10°C</span>
                  <span>40°C</span>
                </div>
              </div>

              {/* Appliance Usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Appliance Usage</span>
                  </div>
                  <Badge variant="secondary">{params.applianceUsage}%</Badge>
                </div>
                <Slider
                  value={[params.applianceUsage]}
                  onValueChange={([value]) => setParams(prev => ({ ...prev, applianceUsage: value }))}
                  min={20}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Minimal</span>
                  <span>Heavy Usage</span>
                </div>
              </div>

              {/* Solar Panel Angle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium">Solar Panel Angle</span>
                  </div>
                  <Badge variant="secondary">{params.solarAngle}°</Badge>
                </div>
                <Slider
                  value={[params.solarAngle]}
                  onValueChange={([value]) => setParams(prev => ({ ...prev, solarAngle: value }))}
                  min={0}
                  max={90}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Flat</span>
                  <span>Vertical</span>
                </div>
              </div>

              {/* Weather Condition */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">Weather Condition</span>
                </div>
                <Select
                  value={params.weatherCondition}
                  onValueChange={(value) => setParams(prev => ({ ...prev, weatherCondition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>{currentWeather?.icon}</span>
                        <span>{currentWeather?.label}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {weatherOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* AI Predictions */}
          <Card className="bg-gray-900/80 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AI Predictions</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCalculating ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                  <span className="text-xs">{prediction.confidence}% confident</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Generation</div>
                  <div className="text-2xl font-bold text-green-400">{prediction.generation} kWh</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Consumption</div>
                  <div className="text-2xl font-bold text-blue-400">{prediction.consumption} kWh</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Energy Efficiency</span>
                  <span className="text-sm font-semibold">{prediction.efficiency}%</span>
                </div>
                <Progress value={prediction.efficiency} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Daily Cost</div>
                  <div className="text-lg font-semibold">₹{prediction.cost}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Carbon Saved</div>
                  <div className="text-lg font-semibold text-green-400">{prediction.carbonSaved} kg</div>
                </div>
              </div>
              
              {/* Surplus/Deficit Indicator */}
              <div className={`p-3 rounded-lg ${surplus >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="flex items-center gap-2">
                  {surplus >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium">
                    {surplus >= 0 ? `${surplus.toFixed(1)} kWh Surplus` : `${Math.abs(surplus).toFixed(1)} kWh Deficit`}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {surplus >= 0 ? 'Excess energy available' : 'Additional energy needed'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Prediction Chart */}
          <Card className="bg-gray-900/80 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">24-Hour Forecast</CardTitle>
              <CardDescription>Predicted energy flow throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={hourlyData}>
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="generation" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Generation (kWh)"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="consumption" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Consumption (kWh)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 