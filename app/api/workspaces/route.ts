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

    // Get user's workspaces with member count
    const workspaces = await prisma.workspace.findMany({
      where: {
        users: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
        users: {
          where: {
            userId: user.id,
          },
          select: {
            role: true,
          },
        },
      },
    })

    // Format response
    const formattedWorkspaces = workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      role: workspace.users[0]?.role,
      _count: workspace._count,
    }))

    return NextResponse.json({
      workspaces: formattedWorkspaces,
    })
  } catch (error) {
    console.error("Workspaces fetch error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
