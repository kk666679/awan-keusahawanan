#!/usr/bin/env tsx

import { createComputeWorker, createNotificationWorker } from "@/lib/queue"
import { createLogger } from "@/lib/logger"
import { config } from "@/lib/config"

const logger = createLogger("worker")

async function startWorkers() {
  logger.info("Starting Awan Keusahawanan workers", {
    nodeEnv: config.NODE_ENV,
    redisUrl: config.REDIS_URL,
  })

  // Start compute worker
  const computeWorker = createComputeWorker()
  computeWorker.on("completed", (job) => {
    logger.info("Compute job completed", { jobId: job.id })
  })
  computeWorker.on("failed", (job, err) => {
    logger.error("Compute job failed", { jobId: job?.id, error: err })
  })

  // Start notification worker
  const notificationWorker = createNotificationWorker()
  notificationWorker.on("completed", (job) => {
    logger.info("Notification sent", { jobId: job.id })
  })
  notificationWorker.on("failed", (job, err) => {
    logger.error("Notification failed", { jobId: job?.id, error: err })
  })

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down workers...")
    await computeWorker.close()
    await notificationWorker.close()
    process.exit(0)
  })

  logger.info("Workers started successfully")
}

startWorkers().catch((error) => {
  logger.error("Failed to start workers", { error })
  process.exit(1)
})