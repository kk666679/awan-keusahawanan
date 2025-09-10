import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token pengesahan diperlukan" }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { 
        verificationToken: token,
        emailVerified: null
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        emailVerified: new Date(),
        verificationToken: null
      }
    })

    const authToken = generateToken({
      userId: user.id,
      email: user.email
    })

    return NextResponse.json({
      success: true,
      message: "Akaun berjaya disahkan",
      token: authToken
    })

  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}