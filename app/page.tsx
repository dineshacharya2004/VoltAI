"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Zap,
  TrendingUp,
  Leaf,
  Sun,
  Battery,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  BarChart3,
  Clock,
  MapPin,
  Star,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

// Dummy data based on PRD specifications
const userData = {
  address: "0x742d35Cc1C4312C6c2e86C0C5C85f26926F4e41E",
  name: "Rajesh Sharma",
  location: "Koramangala, Bangalore",
  role: "prosumer",
  solarCapacity: "5kW",
  reputation: 4.8,
  totalTrades: 156,
  energySold: "2,340kWh",
  earnings: "₹18,720",
}

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

const sellOrders = [
  {
    id: "SO_001",
    seller: "Rajesh Sharma",
    quantity: "15kWh",
    price: "₹5.20",
    location: "Koramangala (2.1km)",
    deliveryTime: "10:00-16:00",
    energySource: "Solar",
    reputation: 4.8,
  },
  {
    id: "SO_002",
    seller: "Suresh Manufacturing",
    quantity: "100kWh",
    price: "₹4.80",
    location: "Whitefield (8.5km)",
    deliveryTime: "09:00-17:00",
    energySource: "Solar",
    reputation: 4.9,
  },
  {
    id: "SO_003",
    seller: "Green Energy Co-op",
    quantity: "50kWh",
    price: "₹5.10",
    location: "HSR Layout (4.2km)",
    deliveryTime: "11:00-15:00",
    energySource: "Solar",
    reputation: 4.7,
  },
]

const buyOrders = [
  {
    id: "BO_001",
    buyer: "Priya Patel",
    quantity: "12kWh",
    maxPrice: "₹5.50",
    location: "Indiranagar",
    requiredTime: "18:00-22:00",
    reputation: 4.7,
  },
  {
    id: "BO_002",
    buyer: "Tech Startup Hub",
    quantity: "80kWh",
    maxPrice: "₹5.30",
    location: "HSR Layout",
    requiredTime: "08:00-18:00",
    reputation: 4.9,
  },
]

const recentTrades = [
  {
    tradeId: "TXN_12456",
    seller: "Rajesh Sharma",
    buyer: "Priya Patel",
    quantity: "10kWh",
    price: "₹5.30",
    totalValue: "₹53.00",
    executionTime: "11:30",
    carbonSaved: "8.5kg CO2",
  },
  {
    tradeId: "TXN_12455",
    seller: "Suresh Manufacturing",
    buyer: "Tech Startup Hub",
    quantity: "50kWh",
    price: "₹4.90",
    totalValue: "₹245.00",
    executionTime: "10:15",
    carbonSaved: "42.5kg CO2",
  },
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

export default function PeerWattDashboard() {
  const [isConnected, setIsConnected] = useState(false)
  const [currentTab, setCurrentTab] = useState("dashboard")
  const [livePrice, setLivePrice] = useState(5.25)

  useEffect(() => {
    // Simulate live price updates
    const interval = setInterval(() => {
      setLivePrice((prev) => prev + (Math.random() - 0.5) * 0.1)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const connectWallet = () => {
    setIsConnected(true)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to PeerWatt X</CardTitle>
            <CardDescription>The UPI for electricity - trade clean energy with your neighbors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Connect your wallet to start trading energy</p>
              <Button onClick={connectWallet} className="w-full" size="lg">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">30-40%</div>
                <div className="text-xs text-muted-foreground">Cost Savings</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">25%</div>
                <div className="text-xs text-muted-foreground">More Renewable</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">100%</div>
                <div className="text-xs text-muted-foreground">Transparent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">PeerWatt X</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
              Live: ₹{livePrice.toFixed(2)}/kWh
            </Badge>
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback>RS</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{userData.name}</div>
                <div className="text-muted-foreground">{userData.location}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="forecast">AI Forecast</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Energy Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Generation</CardTitle>
                  <Sun className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18.2 kWh</div>
                  <p className="text-xs text-muted-foreground">+12% from yesterday</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Consumption</CardTitle>
                  <Battery className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12.5 kWh</div>
                  <p className="text-xs text-muted-foreground">5.7 kWh surplus</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹89.50</div>
                  <p className="text-xs text-muted-foreground">From 17 kWh sold</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Carbon Saved</CardTitle>
                  <Leaf className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">14.5 kg</div>
                  <p className="text-xs text-muted-foreground">CO2 offset today</p>
                </CardContent>
              </Card>
            </div>

            {/* Energy Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Energy Flow Today</CardTitle>
                <CardDescription>Real-time generation vs consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={energyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <ArrowUpRight className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Sell Energy</h3>
                  <p className="text-sm text-muted-foreground">List your surplus energy</p>
                  <Button className="w-full mt-3" variant="outline">
                    Create Sell Order
                  </Button>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <ArrowDownLeft className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Buy Energy</h3>
                  <p className="text-sm text-muted-foreground">Purchase clean energy</p>
                  <Button className="w-full mt-3" variant="outline">
                    Create Buy Order
                  </Button>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Analytics</h3>
                  <p className="text-sm text-muted-foreground">View detailed insights</p>
                  <Button className="w-full mt-3" variant="outline">
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sell Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ArrowUpRight className="w-5 h-5 mr-2 text-green-600" />
                    Sell Orders
                  </CardTitle>
                  <CardDescription>Available energy for purchase</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sellOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{order.seller}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {order.location}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-500 mr-1" />
                          <span className="text-sm">{order.reputation}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-lg font-bold">{order.quantity}</div>
                          <div className="text-sm text-muted-foreground">Quantity</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">{order.price}/kWh</div>
                          <div className="text-sm text-muted-foreground">Price</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {order.deliveryTime}
                        </div>
                        <Button size="sm">Buy Now</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Buy Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ArrowDownLeft className="w-5 h-5 mr-2 text-blue-600" />
                    Buy Orders
                  </CardTitle>
                  <CardDescription>Energy demand requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {buyOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{order.buyer}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {order.location}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-500 mr-1" />
                          <span className="text-sm">{order.reputation}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-lg font-bold">{order.quantity}</div>
                          <div className="text-sm text-muted-foreground">Needed</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">{order.maxPrice}/kWh</div>
                          <div className="text-sm text-muted-foreground">Max Price</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {order.requiredTime}
                        </div>
                        <Button size="sm" variant="outline">
                          Sell to Them
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent Trades */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>Latest completed transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <div key={trade.tradeId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Zap className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {trade.quantity} @ {trade.price}/kWh
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {trade.seller} → {trade.buyer}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{trade.totalValue}</div>
                        <div className="text-sm text-green-600">{trade.carbonSaved}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Solar Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sun className="w-5 h-5 mr-2 text-yellow-600" />
                    Solar Generation Forecast
                  </CardTitle>
                  <CardDescription>AI-powered prediction for tomorrow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{forecastData.solar.today}</div>
                    <div className="text-muted-foreground">Predicted Generation</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">{forecastData.solar.confidence}</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium">Weather Condition</div>
                    <div className="text-sm text-muted-foreground">{forecastData.solar.weather}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Peak Hour</div>
                      <div className="text-muted-foreground">12:00 PM</div>
                    </div>
                    <div>
                      <div className="font-medium">Peak Output</div>
                      <div className="text-muted-foreground">4.2 kWh</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Consumption Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Battery className="w-5 h-5 mr-2 text-blue-600" />
                    Consumption Forecast
                  </CardTitle>
                  <CardDescription>Predicted energy usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{forecastData.consumption.today}</div>
                    <div className="text-muted-foreground">Predicted Consumption</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-semibold">{forecastData.consumption.confidence}</span>
                    </div>
                    <Progress value={82} className="h-2" />
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm font-medium">Influencing Factors</div>
                    <div className="text-sm text-muted-foreground">{forecastData.consumption.factors.join(", ")}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Peak Hour</div>
                      <div className="text-muted-foreground">7:00 PM</div>
                    </div>
                    <div>
                      <div className="font-medium">Peak Usage</div>
                      <div className="text-muted-foreground">3.2 kWh</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>AI Trading Recommendations</CardTitle>
                <CardDescription>Optimized trading strategy for maximum returns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="font-semibold text-green-800">Sell Recommendation</div>
                    <div className="text-2xl font-bold text-green-600">1.4 kWh</div>
                    <div className="text-sm text-green-700">Surplus available at 2:00 PM</div>
                    <div className="text-sm text-green-600 mt-2">Expected price: ₹5.40/kWh</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="font-semibold text-blue-800">Buy Recommendation</div>
                    <div className="text-2xl font-bold text-blue-600">2.1 kWh</div>
                    <div className="text-sm text-blue-700">Needed at 7:00 PM</div>
                    <div className="text-sm text-blue-600 mt-2">Target price: ₹5.20/kWh</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="font-semibold text-purple-800">Potential Savings</div>
                    <div className="text-2xl font-bold text-purple-600">₹45.80</div>
                    <div className="text-sm text-purple-700">vs grid electricity</div>
                    <div className="text-sm text-purple-600 mt-2">Carbon saved: 12.3kg CO2</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userData.earnings}</div>
                  <p className="text-xs text-muted-foreground">+15% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Energy Traded</CardTitle>
                  <Zap className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userData.energySold}</div>
                  <p className="text-xs text-muted-foreground">Across {userData.totalTrades} trades</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reputation Score</CardTitle>
                  <Star className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userData.reputation}/5.0</div>
                  <p className="text-xs text-muted-foreground">Excellent trader rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Carbon Impact</CardTitle>
                  <Leaf className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,989kg</div>
                  <p className="text-xs text-muted-foreground">CO2 offset this year</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>Energy trading and earnings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={[
                      { month: "Jan", earnings: 1470, energySold: 280 },
                      { month: "Feb", earnings: 1680, energySold: 320 },
                      { month: "Mar", earnings: 1995, energySold: 380 },
                      { month: "Apr", earnings: 2240, energySold: 425 },
                      { month: "May", earnings: 2580, energySold: 490 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="earnings"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Earnings (₹)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="energySold"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Energy Sold (kWh)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trading Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Sell Price</span>
                    <span className="font-semibold">₹5.25/kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grid Feed-in Rate</span>
                    <span className="text-muted-foreground">₹2.50/kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium Earned</span>
                    <span className="font-semibold text-green-600">+110%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-semibold">98.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Trade Size</span>
                    <span className="font-semibold">15 kWh</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Environmental Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total CO2 Offset</span>
                    <span className="font-semibold text-green-600">1,989 kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equivalent Trees</span>
                    <span className="font-semibold">90 trees</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Renewable %</span>
                    <span className="font-semibold">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grid Dependency</span>
                    <span className="font-semibold text-blue-600">-35%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Community Impact</span>
                    <span className="font-semibold">High</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
