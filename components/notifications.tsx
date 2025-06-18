"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Check, Zap, TrendingUp, AlertCircle, Clock } from "lucide-react"

interface Notification {
  id: string
  type: "trade" | "price" | "system" | "forecast"
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: "low" | "medium" | "high"
  actionRequired?: boolean
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "trade",
      title: "Trade Completed",
      message: "Your 15kWh energy sale to Priya Patel has been completed successfully.",
      timestamp: "5 min ago",
      read: false,
      priority: "medium",
    },
    {
      id: "2",
      type: "price",
      title: "Price Alert",
      message: "Energy prices in your area have increased to ₹5.40/kWh (+8%)",
      timestamp: "15 min ago",
      read: false,
      priority: "high",
    },
    {
      id: "3",
      type: "forecast",
      title: "AI Recommendation",
      message: "High solar generation expected tomorrow. Consider listing energy for sale.",
      timestamp: "1 hour ago",
      read: true,
      priority: "medium",
    },
    {
      id: "4",
      type: "system",
      title: "Order Expired",
      message: "Your sell order for 20kWh has expired without matching.",
      timestamp: "2 hours ago",
      read: true,
      priority: "low",
      actionRequired: true,
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "trade":
        return <Zap className="w-4 h-4 text-green-600" />
      case "price":
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      case "forecast":
        return <Clock className="w-4 h-4 text-purple-600" />
      case "system":
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "medium":
        return "border-l-yellow-500"
      case "low":
        return "border-l-gray-300"
      default:
        return "border-l-gray-300"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
              {unreadCount > 0 && <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>}
            </CardTitle>
            <CardDescription>Stay updated with your energy trading activity</CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 ${getPriorityColor(notification.priority)} bg-white p-3 rounded-r-lg ${
                  !notification.read ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        {notification.actionRequired && (
                          <Badge variant="outline" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      <div className="text-xs text-muted-foreground mt-2">{notification.timestamp}</div>
                    </div>
                  </div>
                  {!notification.read && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
