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

    // Mock recent activity data - in real app, this would come from an activity log table
    const activities = [
      {
        id: "1",
        type: "invoice",
        description: "Invois INV-001 telah dibayar oleh Syarikat XYZ",
        timestamp: "2 jam yang lalu",
        status: "completed",
      },
      {
        id: "2",
        type: "customer",
        description: "Pelanggan baharu 'Kedai Runcit Pak Abu' telah didaftarkan",
        timestamp: "4 jam yang lalu",
        status: "completed",
      },
      {
        id: "3",
        type: "compute",
        description: "Tugas pemprosesan data GPU telah selesai",
        timestamp: "6 jam yang lalu",
        status: "completed",
      },
      {
        id: "4",
        type: "product",
        description: "Stok produk 'Laptop Dell' mencapai tahap rendah",
        timestamp: "1 hari yang lalu",
        status: "warning",
      },
      {
        id: "5",
        type: "task",
        description: "Tugas 'Kemaskini website' telah diselesaikan",
        timestamp: "2 hari yang lalu",
        status: "completed",
      },
    ]

    return NextResponse.json({ activities })
  } catch (error) {
    console.error("Dashboard activity error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
