import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { config } from "./config"
import { createLogger } from "./logger"

const logger = createLogger("storage")

// S3-compatible client (works with MinIO and AWS S3)
const s3Client = new S3Client({
  endpoint: config.S3_USE_SSL 
    ? `https://${config.S3_ENDPOINT}:${config.S3_PORT}`
    : `http://${config.S3_ENDPOINT}:${config.S3_PORT}`,
  region: "us-east-1", // Required but ignored by MinIO
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
})

export const storage = {
  async uploadFile(key: string, buffer: Buffer, contentType?: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })

      await s3Client.send(command)
      logger.info("File uploaded successfully", { key })
      
      return key
    } catch (error) {
      logger.error("File upload failed", { key, error })
      throw error
    }
  },

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET_NAME,
        Key: key,
      })

      const response = await s3Client.send(command)
      const chunks: Uint8Array[] = []
      
      if (response.Body) {
        // @ts-ignore - Body is a stream
        for await (const chunk of response.Body) {
          chunks.push(chunk)
        }
      }

      return Buffer.concat(chunks)
    } catch (error) {
      logger.error("File download failed", { key, error })
      throw error
    }
  },

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.S3_BUCKET_NAME,
        Key: key,
      })

      await s3Client.send(command)
      logger.info("File deleted successfully", { key })
    } catch (error) {
      logger.error("File deletion failed", { key, error })
      throw error
    }
  },

  async getSignedUploadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET_NAME,
        Key: key,
      })

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
      logger.info("Generated signed upload URL", { key, expiresIn })
      
      return signedUrl
    } catch (error) {
      logger.error("Failed to generate signed upload URL", { key, error })
      throw error
    }
  },

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET_NAME,
        Key: key,
      })

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
      logger.info("Generated signed download URL", { key, expiresIn })
      
      return signedUrl
    } catch (error) {
      logger.error("Failed to generate signed download URL", { key, error })
      throw error
    }
  },

  // Helper functions for common file operations
  generateKey(workspaceId: string, userId: string, filename: string): string {
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    return `workspaces/${workspaceId}/users/${userId}/${timestamp}_${sanitizedFilename}`
  },

  generateJobOutputKey(workspaceId: string, jobId: string, filename: string): string {
    return `workspaces/${workspaceId}/jobs/${jobId}/output/${filename}`
  },
}