"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users } from "lucide-react"

const nearbyProsumers = [
  {
    id: "1",
    name: "Rajesh Sharma",
    distance: "2.1km",
    capacity: "5kW",
    available: "15kWh",
    price: "₹5.20/kWh",
    coordinates: { x: 45, y: 30 },
  },
  {
    id: "2",
    name: "Green Co-op",
    distance: "4.2km",
    capacity: "25kW",
    available: "50kWh",
    price: "₹5.10/kWh",
    coordinates: { x: 65, y: 55 },
  },
  {
    id: "3",
    name: "Solar Villa",
    distance: "6.8km",
    capacity: "8kW",
    available: "20kWh",
    price: "₹5.35/kWh",
    coordinates: { x: 25, y: 70 },
  },
]

export function EnergyMap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Nearby Energy Sources
        </CardTitle>
        <CardDescription>Available energy within 10km radius</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 h-[300px] overflow-hidden">
          {/* Map Background */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Your Location */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap">
              You
            </div>
          </div>

          {/* Prosumer Locations */}
          {nearbyProsumers.map((prosumer) => (
            <div
              key={prosumer.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              style={{
                left: `${prosumer.coordinates.x}%`,
                top: `${prosumer.coordinates.y}%`,
              }}
            >
              <div className="w-3 h-3 bg-green-500 rounded-full border border-white shadow-md group-hover:scale-125 transition-transform"></div>

              {/* Tooltip */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="text-xs font-medium">{prosumer.name}</div>
                <div className="text-xs text-muted-foreground">{prosumer.distance}</div>
                <div className="text-xs text-green-600 font-medium">
                  {prosumer.available} @ {prosumer.price}
                </div>
              </div>
            </div>
          ))}

          {/* Connection Lines */}
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            {nearbyProsumers.map((prosumer) => (
              <line
                key={`line-${prosumer.id}`}
                x1="50%"
                y1="50%"
                x2={`${prosumer.coordinates.x}%`}
                y2={`${prosumer.coordinates.y}%`}
                stroke="#22c55e"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.3"
              />
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-1"></div>
              <span>Your Location</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              <span>Energy Sources</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {nearbyProsumers.length} nearby
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
