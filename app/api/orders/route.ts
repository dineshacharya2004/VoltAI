import { type NextRequest, NextResponse } from "next/server"

// Simulated database
const orders = [
  {
    id: "SO_001",
    type: "sell",
    userId: "0x742d35Cc1C4312C6c2e86C0C5C85f26926F4e41E",
    quantity: 15,
    price: 5.2,
    status: "active",
    createdAt: new Date().toISOString(),
    deliveryWindow: {
      start: "10:00",
      end: "16:00",
    },
  },
]

export async function GET() {
  return NextResponse.json({
    success: true,
    data: orders,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const newOrder = {
      id: `${body.type.toUpperCase()}_${Date.now()}`,
      ...body,
      status: "active",
      createdAt: new Date().toISOString(),
    }

    orders.push(newOrder)

    return NextResponse.json({
      success: true,
      data: newOrder,
      message: "Order created successfully",
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 })
  }
}
