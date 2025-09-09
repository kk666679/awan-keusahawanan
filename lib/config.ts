import { z } from "zod"

const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default(3000),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("90d"),

  // Redis
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  // Object Storage
  S3_ENDPOINT: z.string().default("localhost"),
  S3_PORT: z.string().transform(Number).default(9000),
  S3_USE_SSL: z.string().transform(Boolean).default(false),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET_NAME: z.string().default("awan-keusahawanan"),

  // Email
  SMTP_HOST: z.string().default("smtp.ethereal.email"),
  SMTP_PORT: z.string().transform(Number).default(587),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Compute Platform
  KUBERNETES_NAMESPACE: z.string().default("awan-keusahawanan"),
  GPU_ENABLED: z.string().transform(Boolean).default(false),
})

function validateConfig() {
  try {
    return configSchema.parse(process.env)
  } catch (error) {
    console.error("❌ Invalid environment configuration:", error)
    process.exit(1)
  }
}

export const config = validateConfig()
export type Config = z.infer<typeof configSchema>