import { Queue, Worker, Job } from "bullmq"
import { redis } from "./redis"
import { createLogger } from "./logger"

const logger = createLogger("queue")

// Job types
export interface ComputeJobData {
  jobId: string
  workspaceId: string
  userId: string
  jobType: "cpu" | "gpu"
  command: string
  parameters: Record<string, any>
  resourceRequest?: {
    cpuCores?: number
    memoryGb?: number
    gpuType?: string
    gpuCount?: number
  }
}

export interface NotificationJobData {
  type: "email" | "websocket"
  recipient: string
  subject?: string
  message: string
  data?: Record<string, any>
}

// Queue instances
export const computeQueue = new Queue<ComputeJobData>("compute", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
})

export const notificationQueue = new Queue<NotificationJobData>("notifications", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
  },
})

// Job submission helpers
export const jobQueue = {
  async submitComputeJob(data: ComputeJobData, priority?: number) {
    try {
      const job = await computeQueue.add("process", data, {
        priority: priority || 0,
        jobId: data.jobId,
      })
      logger.info("Compute job submitted", { jobId: data.jobId, queueJobId: job.id })
      return job
    } catch (error) {
      logger.error("Failed to submit compute job", { jobId: data.jobId, error })
      throw error
    }
  },

  async submitNotification(data: NotificationJobData) {
    try {
      const job = await notificationQueue.add("send", data)
      logger.info("Notification job submitted", { type: data.type, recipient: data.recipient })
      return job
    } catch (error) {
      logger.error("Failed to submit notification", { error })
      throw error
    }
  },

  async getJobStatus(jobId: string) {
    try {
      const job = await computeQueue.getJob(jobId)
      if (!job) return null

      return {
        id: job.id,
        status: await job.getState(),
        progress: job.progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }
    } catch (error) {
      logger.error("Failed to get job status", { jobId, error })
      return null
    }
  },
}

// Worker setup (to be called in separate processes)
export function createComputeWorker() {
  return new Worker<ComputeJobData>(
    "compute",
    async (job: Job<ComputeJobData>) => {
      logger.info("Processing compute job", { jobId: job.data.jobId })
      
      // TODO: Implement actual compute job processing
      // This will interface with Kubernetes to create pods
      await new Promise(resolve => setTimeout(resolve, 5000)) // Simulate work
      
      return { status: "completed", output: "Job processed successfully" }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  )
}

export function createNotificationWorker() {
  return new Worker<NotificationJobData>(
    "notifications",
    async (job: Job<NotificationJobData>) => {
      logger.info("Processing notification", { type: job.data.type })
      
      // TODO: Implement actual notification sending
      // Email via SMTP, WebSocket via Socket.IO
      
      return { status: "sent" }
    },
    {
      connection: redis,
      concurrency: 10,
    }
  )
}