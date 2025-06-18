import { type NextRequest, NextResponse } from "next/server"

// Simulated trade data
const trades = [
  {
    id: "TXN_12456",
    sellerId: "0x742d35Cc1C4312C6c2e86C0C5C85f26926F4e41E",
    buyerId: "0x9f2d35Cc1C4312C6c2e86C0C5C85f26926F4e41F",
    quantity: 10,
    price: 5.3,
    totalValue: 53.0,
    status: "completed",
    executedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    blockchainTx: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    carbonSaved: 8.5,
  },
  {
    id: "TXN_12455",
    sellerId: "0x8ba1f109551bD432803012645Hac136c9.truth.eth",
    buyerId: "0x1a2d35Cc1C4312C6c2e86C0C5C85f26926F4e42G",
    quantity: 50,
    price: 4.9,
    totalValue: 245.0,
    status: "completed",
    executedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    blockchainTx: "0x2b3c4d5e6f7890abcdef1234567890abcdef1234",
    carbonSaved: 42.5,
  },
]

export async function GET() {
  return NextResponse.json({
    success: true,
    data: trades,
    total: trades.length,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const newTrade = {
      id: `TXN_${Date.now()}`,
      ...body,
      status: "pending",
      executedAt: new Date().toISOString(),
      blockchainTx: `0x${Math.random().toString(16).substr(2, 40)}`,
    }

    trades.unshift(newTrade)

    // Simulate blockchain confirmation delay
    setTimeout(() => {
      const trade = trades.find((t) => t.id === newTrade.id)
      if (trade) {
        trade.status = "completed"
      }
    }, 5000)

    return NextResponse.json({
      success: true,
      data: newTrade,
      message: "Trade initiated successfully",
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to execute trade" }, { status: 500 })
  }
}
