import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hashPassword, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, workspaceName, workspaceSlug } = await request.json()

    if (!name || !email || !password || !workspaceName || !workspaceSlug) {
      return NextResponse.json({ error: "Semua medan diperlukan" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Pengguna dengan emel ini sudah wujud" }, { status: 400 })
    }

    // Check if workspace slug is taken
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    })

    if (existingWorkspace) {
      return NextResponse.json({ error: "URL workspace sudah digunakan" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user and workspace in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "USER",
        },
      })

      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
          description: `Workspace untuk ${workspaceName}`,
        },
      })

      // Link user to workspace as owner
      await tx.userOnWorkspace.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "OWNER",
        },
      })

      return { user, workspace }
    })

    // Generate token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      workspaceId: result.workspace.id,
    })

    return NextResponse.json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
