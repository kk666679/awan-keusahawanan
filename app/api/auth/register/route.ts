import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hashPassword, generateToken } from "@/lib/auth"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_REGEX = /^[a-z0-9-]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, workspaceName, workspaceSlug } = body

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !password || !workspaceName?.trim() || !workspaceSlug?.trim()) {
      return NextResponse.json({ error: "Semua medan diperlukan" }, { status: 400 })
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Format emel tidak sah" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: "Kata laluan mestilah sekurang-kurangnya 8 aksara" }, { status: 400 })
    }

    // Validate workspace slug format
    if (!SLUG_REGEX.test(workspaceSlug) || workspaceSlug.length < 3) {
      return NextResponse.json({ error: "URL workspace tidak sah (gunakan huruf kecil, nombor, dan tanda sempang sahaja)" }, { status: 400 })
    }

    // Check for existing user and workspace in parallel
    const [existingUser, existingWorkspace] = await Promise.all([
      prisma.user.findUnique({ where: { email: email.toLowerCase() } }),
      prisma.workspace.findUnique({ where: { slug: workspaceSlug.toLowerCase() } })
    ])

    if (existingUser) {
      return NextResponse.json({ error: "Pengguna dengan emel ini sudah wujud" }, { status: 409 })
    }

    if (existingWorkspace) {
      return NextResponse.json({ error: "URL workspace sudah digunakan" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user and workspace in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: "USER",
        },
      })

      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName.trim(),
          slug: workspaceSlug.toLowerCase().trim(),
          description: `Workspace untuk ${workspaceName.trim()}`,
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
    }, {
      timeout: 10000, // 10 second timeout
    })

    // Generate token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      workspaceId: result.workspace.id,
    })

    return NextResponse.json({
      success: true,
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
    }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    
    // Handle specific Prisma errors
    if (error?.code === 'P2002') {
      const target = error?.meta?.target
      if (target?.includes('email')) {
        return NextResponse.json({ error: "Emel sudah digunakan" }, { status: 409 })
      }
      if (target?.includes('slug')) {
        return NextResponse.json({ error: "URL workspace sudah digunakan" }, { status: 409 })
      }
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Data tidak sah" }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
