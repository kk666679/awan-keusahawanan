import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { jobQueue } from "@/lib/queue"
import { createLogger } from "@/lib/logger"

const logger = createLogger("compute-api")

const createJobSchema = z.object({
  jobType: z.enum(["cpu", "gpu"]),
  command: z.string(),
  parameters: z.record(z.any()).optional(),
  resourceRequest: z.object({
    cpuCores: z.number().optional(),
    memoryGb: z.number().optional(),
    gpuType: z.string().optional(),
    gpuCount: z.number().optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createJobSchema.parse(body)

    // Get user's workspace (simplified - take first workspace)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { workspaces: { include: { workspace: true } } },
    })

    if (!user || user.workspaces.length === 0) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    const workspaceId = user.workspaces[0].workspaceId

    // Create compute job record
    const computeJob = await prisma.computeJob.create({
      data: {
        workspaceId,
        userId,
        jobType: validatedData.jobType === "cpu" ? "CPU_PROCESSING" : "GPU_TRAINING",
        command: validatedData.command,
        parameters: validatedData.parameters || {},
        cpuCores: validatedData.resourceRequest?.cpuCores,
        memoryGb: validatedData.resourceRequest?.memoryGb,
        gpuType: validatedData.resourceRequest?.gpuType,
        gpuCount: validatedData.resourceRequest?.gpuCount,
      },
    })

    // Submit to job queue
    await jobQueue.submitComputeJob({
      jobId: computeJob.id,
      workspaceId,
      userId,
      jobType: validatedData.jobType,
      command: validatedData.command,
      parameters: validatedData.parameters || {},
      resourceRequest: validatedData.resourceRequest,
    })

    logger.info("Compute job created", { jobId: computeJob.id, userId })

    return NextResponse.json({
      success: true,
      jobId: computeJob.id,
      message: "Job queued successfully",
    })
  } catch (error) {
    logger.error("Failed to create compute job", { error })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const jobs = await prisma.computeJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    logger.error("Failed to fetch compute jobs", { error })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}