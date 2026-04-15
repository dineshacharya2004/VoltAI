import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "solar"

  // Simulate AI forecast data
  const forecastData = {
    solar: {
      prediction: 18.2,
      confidence: 85,
      weather: "Partly Cloudy",
      peakHour: "12:00",
      peakOutput: 4.2,
      factors: ["Weather conditions", "Seasonal patterns", "Historical data"],
    },
    consumption: {
      prediction: 16.8,
      confidence: 82,
      peakHour: "19:00",
      peakUsage: 3.2,
      factors: ["Weekend pattern", "Temperature forecast", "Historical usage"],
    },
    price: {
      prediction: 5.35,
      confidence: 78,
      trend: "increasing",
      factors: ["High demand period", "Limited supply", "Market conditions"],
    },
  }

  return NextResponse.json({
    success: true,
    data: forecastData[type as keyof typeof forecastData] || forecastData.solar,
    timestamp: new Date().toISOString(),
  })
}
