import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        workspaceId,
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Produk tidak dijumpai" }, { status: 404 })
    }

    // Mock stock movements - in real app, this would come from a stock_movements table
    const stockMovements = [
      {
        id: "1",
        type: "IN",
        quantity: product.stock,
        reason: "Stok awal",
        createdAt: product.createdAt,
      },
    ]

    return NextResponse.json({ product, stockMovements })
  } catch (error) {
    console.error("Product fetch error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { name, description, sku, price, cost, stock, lowStock } = await request.json()

    if (!name || price === undefined || stock === undefined || lowStock === undefined) {
      return NextResponse.json({ error: "Nama, harga, stok, dan tahap stok rendah diperlukan" }, { status: 400 })
    }

    // Check if SKU already exists in workspace (excluding current product)
    if (sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          workspaceId,
          sku,
          NOT: { id: params.id },
        },
      })

      if (existingSku) {
        return NextResponse.json({ error: "SKU sudah wujud dalam workspace ini" }, { status: 400 })
      }
    }

    const product = await prisma.product.updateMany({
      where: {
        id: params.id,
        workspaceId,
      },
      data: {
        name,
        description: description || null,
        sku: sku || null,
        price,
        cost: cost || null,
        stock,
        lowStock,
      },
    })

    if (product.count === 0) {
      return NextResponse.json({ error: "Produk tidak dijumpai" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Product update error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const product = await prisma.product.deleteMany({
      where: {
        id: params.id,
        workspaceId,
      },
    })

    if (product.count === 0) {
      return NextResponse.json({ error: "Produk tidak dijumpai" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Product deletion error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
