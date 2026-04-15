"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link, Shield, Zap, Clock, ExternalLink } from "lucide-react"

interface Transaction {
  hash: string
  type: "trade" | "order" | "settlement"
  status: "pending" | "confirmed" | "failed"
  timestamp: string
  gasUsed?: string
  value?: string
}

export function BlockchainStatus() {
  const [networkStatus, setNetworkStatus] = useState({
    connected: true,
    network: "Polygon Mainnet",
    blockNumber: 52847392,
    gasPrice: "32 gwei",
  })

  const [recentTxs] = useState<Transaction[]>([
    {
      hash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
      type: "trade",
      status: "confirmed",
      timestamp: "2 min ago",
      gasUsed: "0.0023 MATIC",
      value: "₹53.00",
    },
    {
      hash: "0x2b3c4d5e6f7890abcdef1234567890abcdef1234",
      type: "order",
      status: "pending",
      timestamp: "5 min ago",
      gasUsed: "0.0015 MATIC",
    },
  ])

  useEffect(() => {
    // Simulate blockchain updates
    const interval = setInterval(() => {
      setNetworkStatus((prev) => ({
        ...prev,
        blockNumber: prev.blockNumber + Math.floor(Math.random() * 3) + 1,
      }))
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "trade":
        return <Zap className="w-3 h-3" />
      case "order":
        return <Clock className="w-3 h-3" />
      case "settlement":
        return <Shield className="w-3 h-3" />
      default:
        return <Link className="w-3 h-3" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Link className="w-5 h-5 mr-2" />
          Blockchain Status
        </CardTitle>
        <CardDescription>Network connectivity and transaction history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Status */}
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse-green"></div>
              <span className="font-medium">{networkStatus.network}</span>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Connected
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Latest Block</div>
              <div className="font-medium">#{networkStatus.blockNumber.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Gas Price</div>
              <div className="font-medium">{networkStatus.gasPrice}</div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Recent Transactions</h4>
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-3 h-3 mr-1" />
              View All
            </Button>
          </div>
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <div key={tx.hash} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(tx.type)}
                    <span className="text-sm font-medium capitalize">{tx.type}</span>
                  </div>
                  <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-1">{tx.hash.slice(0, 20)}...</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{tx.timestamp}</span>
                  <div className="text-right">
                    {tx.value && <div className="font-medium">{tx.value}</div>}
                    {tx.gasUsed && <div className="text-muted-foreground">Gas: {tx.gasUsed}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Contract Status */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Smart Contract Health</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Energy Marketplace</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Escrow Manager</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Price Oracle</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
