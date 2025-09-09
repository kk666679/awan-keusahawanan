import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { redis } from "@/lib/redis"
import { createLogger } from "@/lib/logger"

const logger = createLogger("health")

export async function GET() {
  const startTime = Date.now()
  const checks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString(),
  }

  try {
    // Database health check
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    logger.error("Database health check failed", { error })
  }

  try {
    // Redis health check
    await redis.ping()
    checks.redis = true
  } catch (error) {
    logger.error("Redis health check failed", { error })
  }

  const responseTime = Date.now() - startTime
  const isHealthy = checks.database && checks.redis

  const response = {
    status: isHealthy ? "healthy" : "unhealthy",
    checks,
    responseTime,
    version: process.env.npm_package_version || "unknown",
  }

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
  })
}