"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpRight, ArrowDownLeft, Zap } from "lucide-react"

interface TradingModalProps {
  type: "sell" | "buy"
  trigger: React.ReactNode
}

export function TradingModal({ type, trigger }: TradingModalProps) {
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [timeSlot, setTimeSlot] = useState("")
  const [duration, setDuration] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate order creation
    console.log("Order created:", { type, quantity, price, timeSlot, duration })
  }

  const isSell = type === "sell"
  const title = isSell ? "Create Sell Order" : "Create Buy Order"
  const description = isSell ? "List your surplus energy for sale" : "Request energy from the marketplace"
  const icon = isSell ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />
  const color = isSell ? "text-green-600" : "text-blue-600"

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center ${color}`}>
            {icon}
            <span className="ml-2">{title}</span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (kWh)</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="15"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">{isSell ? "Price (₹/kWh)" : "Max Price (₹/kWh)"}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="5.25"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeSlot">{isSell ? "Delivery Window" : "Required Time"}</Label>
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Select time slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (6:00 - 12:00)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12:00 - 18:00)</SelectItem>
                <SelectItem value="evening">Evening (18:00 - 24:00)</SelectItem>
                <SelectItem value="night">Night (0:00 - 6:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Order Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="How long should this order stay active?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1hour">1 Hour</SelectItem>
                <SelectItem value="6hours">6 Hours</SelectItem>
                <SelectItem value="1day">1 Day</SelectItem>
                <SelectItem value="3days">3 Days</SelectItem>
                <SelectItem value="1week">1 Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isSell && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-green-800">Estimated Earnings</div>
              <div className="text-lg font-bold text-green-600">
                ₹{quantity && price ? (Number.parseFloat(quantity) * Number.parseFloat(price)).toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-green-700">
                vs Grid: +
                {quantity && price
                  ? (
                      Number.parseFloat(quantity) * Number.parseFloat(price) -
                      Number.parseFloat(quantity) * 2.5
                    ).toFixed(2)
                  : "0.00"}{" "}
                (₹2.5/kWh)
              </div>
            </div>
          )}

          {!isSell && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Estimated Cost</div>
              <div className="text-lg font-bold text-blue-600">
                ₹{quantity && price ? (Number.parseFloat(quantity) * Number.parseFloat(price)).toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-blue-700">
                vs Retail: -
                {quantity && price
                  ? (
                      Number.parseFloat(quantity) * 8.0 -
                      Number.parseFloat(quantity) * Number.parseFloat(price)
                    ).toFixed(2)
                  : "0.00"}{" "}
                (₹8.0/kWh)
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button type="submit" className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              {isSell ? "List Energy" : "Place Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
