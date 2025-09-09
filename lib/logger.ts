import pino from "pino"
import { config } from "./config"

const logger = pino({
  level: config.NODE_ENV === "development" ? "debug" : "info",
  transport: config.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  } : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export { logger }

// Helper functions for structured logging
export const createLogger = (module: string) => {
  return logger.child({ module })
}

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({ err: error, ...context }, error.message)
}

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(context, message)
}

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(context, message)
}