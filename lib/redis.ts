import Redis from "ioredis"
import { config } from "./config"
import { createLogger } from "./logger"

const logger = createLogger("redis")

class RedisClient {
  private static instance: Redis | null = null

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(config.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })

      RedisClient.instance.on("connect", () => {
        logger.info("Redis connected successfully")
      })

      RedisClient.instance.on("error", (error) => {
        logger.error("Redis connection error:", error)
      })

      RedisClient.instance.on("close", () => {
        logger.warn("Redis connection closed")
      })
    }

    return RedisClient.instance
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit()
      RedisClient.instance = null
      logger.info("Redis disconnected")
    }
  }
}

export const redis = RedisClient.getInstance()

// Cache utilities
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error("Cache get error:", { key, error })
      return null
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized)
      } else {
        await redis.set(key, serialized)
      }
    } catch (error) {
      logger.error("Cache set error:", { key, error })
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      logger.error("Cache delete error:", { key, error })
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      logger.error("Cache exists error:", { key, error })
      return false
    }
  },
}