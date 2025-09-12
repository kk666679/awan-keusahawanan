import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Token tidak disediakan" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 401 })
    }

    // Mock chart data - in production, this would come from your database
    const chartData = [
      { name: "Jan", customers: 12, revenue: 2400, tasks: 8, date: "2024-01-01" },
      { name: "Feb", customers: 19, revenue: 1398, tasks: 12, date: "2024-02-01" },
      { name: "Mar", customers: 15, revenue: 9800, tasks: 15, date: "2024-03-01" },
      { name: "Apr", customers: 25, revenue: 3908, tasks: 18, date: "2024-04-01" },
      { name: "May", customers: 22, revenue: 4800, tasks: 22, date: "2024-05-01" },
      { name: "Jun", customers: 30, revenue: 3800, tasks: 25, date: "2024-06-01" },
      { name: "Jul", customers: 28, revenue: 4300, tasks: 28, date: "2024-07-01" },
      { name: "Aug", customers: 35, revenue: 5200, tasks: 32, date: "2024-08-01" },
      { name: "Sep", customers: 32, revenue: 4900, tasks: 30, date: "2024-09-01" },
      { name: "Oct", customers: 38, revenue: 6100, tasks: 35, date: "2024-10-01" },
      { name: "Nov", customers: 42, revenue: 7200, tasks: 38, date: "2024-11-01" },
      { name: "Dec", customers: 45, revenue: 8500, tasks: 42, date: "2024-12-01" },
    ]

    return NextResponse.json({
      data: chartData,
      message: "Chart data retrieved successfully"
    })
  } catch (error) {
    console.error("Chart data error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
