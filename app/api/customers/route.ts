import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

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

    const workspaceId = request.headers.get("x-workspace-id") || user.workspaces[0]?.workspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace tidak dijumpai" }, { status: 400 })
    }

    const customers = await prisma.customer.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error("Customers fetch error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const workspaceId = request.headers.get("x-workspace-id") || user.workspaces[0]?.workspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace tidak dijumpai" }, { status: 400 })
    }

    const { name, email, phone, company, address, notes } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Nama pelanggan diperlukan" }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        workspaceId,
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
      },
    })

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Customer creation error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
