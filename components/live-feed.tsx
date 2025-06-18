"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Zap, TrendingUp, Activity } from "lucide-react"

interface LiveEvent {
  id: string
  type: "trade" | "order" | "price"
  message: string
  timestamp: string
  value?: string
  trend?: "up" | "down"
}

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([
    {
      id: "1",
      type: "trade",
      message: "Rajesh Sharma sold 10kWh to Priya Patel",
      timestamp: "2 min ago",
      value: "₹53.00",
    },
    {
      id: "2",
      type: "price",
      message: "Market price increased",
      timestamp: "5 min ago",
      value: "₹5.25/kWh",
      trend: "up",
    },
    {
      id: "3",
      type: "order",
      message: "New sell order: 50kWh available",
      timestamp: "8 min ago",
      value: "₹4.90/kWh",
    },
  ])

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      const newEvent: LiveEvent = {
        id: Date.now().toString(),
        type: Math.random() > 0.5 ? "trade" : "order",
        message: Math.random() > 0.5 ? "New trade executed: 15kWh @ ₹5.30/kWh" : "Buy order placed: 25kWh needed",
        timestamp: "Just now",
        value: `₹${(Math.random() * 100 + 50).toFixed(2)}`,
      }

      setEvents((prev) => [newEvent, ...prev.slice(0, 9)])
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case "trade":
        return <Zap className="w-4 h-4 text-green-600" />
      case "price":
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      case "order":
        return <Activity className="w-4 h-4 text-purple-600" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Live Market Feed
        </CardTitle>
        <CardDescription>Real-time trading activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="mt-1">{getIcon(event.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{event.message}</div>
                  <div className="text-xs text-muted-foreground">{event.timestamp}</div>
                </div>
                {event.value && (
                  <Badge variant="outline" className="text-xs">
                    {event.value}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
