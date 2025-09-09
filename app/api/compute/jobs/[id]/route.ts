import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { jobQueue } from "@/lib/queue"
import { createLogger } from "@/lib/logger"

const logger = createLogger("compute-api")

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const jobId = params.id

    // Get job from database
    const job = await prisma.computeJob.findFirst({
      where: { id: jobId, userId },
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Get queue status
    const queueStatus = await jobQueue.getJobStatus(jobId)

    return NextResponse.json({
      job: {
        ...job,
        queueStatus,
      },
    })
  } catch (error) {
    logger.error("Failed to fetch compute job", { jobId: params.id, error })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}