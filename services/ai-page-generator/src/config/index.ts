export default {
  port: process.env.PORT || 3001,
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: process.env.MODEL_NAME || "Salesforce/codegen-2B-mono"
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379")
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET || "awan-pages"
  }
};
