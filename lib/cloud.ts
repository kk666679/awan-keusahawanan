import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';

// Cloud provider configuration
const awsClient = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

let azureClient: BlobServiceClient | null = null;

try {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString && connectionString.trim() !== '') {
    azureClient = BlobServiceClient.fromConnectionString(connectionString);
  }
} catch (error) {
  console.warn('Azure Blob Storage client initialization failed:', error);
  azureClient = null;
}

const gcpClient = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE,
});

// Cloud-agnostic upload function
export async function uploadFile(
  file: Buffer,
  fileName: string,
  provider: 'aws' | 'azure' | 'gcp' = 'aws',
  bucketName?: string
): Promise<string> {
  const bucket = bucketName || getDefaultBucket(provider);

  switch (provider) {
    case 'aws':
      return await uploadToS3(file, fileName, bucket);
    case 'azure':
      return await uploadToAzure(file, fileName, bucket);
    case 'gcp':
      return await uploadToGCP(file, fileName, bucket);
    default:
      throw new Error('Unsupported cloud provider');
  }
}

// AWS S3 upload
async function uploadToS3(file: Buffer, fileName: string, bucket: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: file,
  });
  await awsClient.send(command);
  return `https://${bucket}.s3.amazonaws.com/${fileName}`;
}

// Azure Blob upload
async function uploadToAzure(file: Buffer, fileName: string, containerName: string): Promise<string> {
  if (!azureClient) {
    throw new Error('Azure Blob Storage client not initialized');
  }
  const containerClient = azureClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  await blockBlobClient.upload(file, file.length);
  return blockBlobClient.url;
}

// GCP Storage upload
async function uploadToGCP(file: Buffer, fileName: string, bucketName: string): Promise<string> {
  const bucket = gcpClient.bucket(bucketName);
  const fileObj = bucket.file(fileName);
  await fileObj.save(file);
  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

// Get default bucket/container based on provider
function getDefaultBucket(provider: string): string {
  switch (provider) {
    case 'aws':
      return process.env.AWS_S3_BUCKET || 'default-bucket';
    case 'azure':
      return process.env.AZURE_CONTAINER_NAME || 'default-container';
    case 'gcp':
      return process.env.GCP_BUCKET_NAME || 'default-bucket';
    default:
      return 'default-bucket';
  }
}

// Advanced Load Balancing Configuration
interface ProviderWeight {
  provider: 'aws' | 'azure' | 'gcp';
  weight: number; // Higher weight = more likely to be selected
  healthScore: number; // 0-100, based on recent performance
  lastUsed: Date;
  consecutiveFailures: number;
}

let providerWeights: ProviderWeight[] = [
  { provider: 'aws', weight: 1, healthScore: 100, lastUsed: new Date(), consecutiveFailures: 0 },
  { provider: 'azure', weight: 1, healthScore: 100, lastUsed: new Date(), consecutiveFailures: 0 },
  { provider: 'gcp', weight: 1, healthScore: 100, lastUsed: new Date(), consecutiveFailures: 0 },
];

const MAX_CONSECUTIVE_FAILURES = 3;
const HEALTH_DECAY_RATE = 0.9; // Health score decays by 10% per failure
const HEALTH_RECOVERY_RATE = 1.05; // Health score recovers by 5% per success

// Round-robin index for fallback
let providerIndex = 0;
const providers = ['aws', 'azure', 'gcp'];

// Load balancing strategies
export type LoadBalancingStrategy = 'round-robin' | 'weighted' | 'health-based' | 'least-used';

let currentStrategy: LoadBalancingStrategy = 'weighted';

export function setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
  currentStrategy = strategy;
}

export function getNextProvider(): 'aws' | 'azure' | 'gcp' {
  switch (currentStrategy) {
    case 'round-robin':
      return getRoundRobinProvider();
    case 'weighted':
      return getWeightedProvider();
    case 'health-based':
      return getHealthBasedProvider();
    case 'least-used':
      return getLeastUsedProvider();
    default:
      return getWeightedProvider();
  }
}

function getRoundRobinProvider(): 'aws' | 'azure' | 'gcp' {
  const healthyProviders = providerWeights.filter(p => p.consecutiveFailures < MAX_CONSECUTIVE_FAILURES);
  if (healthyProviders.length === 0) {
    // Fallback to any provider if all are failing
    return providerWeights[0].provider;
  }

  const provider = healthyProviders[providerIndex % healthyProviders.length].provider;
  providerIndex = (providerIndex + 1) % healthyProviders.length;
  updateProviderUsage(provider);
  return provider;
}

function getWeightedProvider(): 'aws' | 'azure' | 'gcp' {
  const healthyProviders = providerWeights.filter(p => p.consecutiveFailures < MAX_CONSECUTIVE_FAILURES);
  if (healthyProviders.length === 0) {
    return providerWeights[0].provider;
  }

  const totalWeight = healthyProviders.reduce((sum, p) => sum + p.weight * (p.healthScore / 100), 0);
  let random = Math.random() * totalWeight;

  for (const providerWeight of healthyProviders) {
    const effectiveWeight = providerWeight.weight * (providerWeight.healthScore / 100);
    random -= effectiveWeight;
    if (random <= 0) {
      updateProviderUsage(providerWeight.provider);
      return providerWeight.provider;
    }
  }

  // Fallback
  const provider = healthyProviders[0].provider;
  updateProviderUsage(provider);
  return provider;
}

function getHealthBasedProvider(): 'aws' | 'azure' | 'gcp' {
  const healthyProviders = providerWeights.filter(p => p.consecutiveFailures < MAX_CONSECUTIVE_FAILURES);
  if (healthyProviders.length === 0) {
    return providerWeights[0].provider;
  }

  // Select provider with highest health score
  const bestProvider = healthyProviders.reduce((best, current) =>
    current.healthScore > best.healthScore ? current : best
  );

  updateProviderUsage(bestProvider.provider);
  return bestProvider.provider;
}

function getLeastUsedProvider(): 'aws' | 'azure' | 'gcp' {
  const healthyProviders = providerWeights.filter(p => p.consecutiveFailures < MAX_CONSECUTIVE_FAILURES);
  if (healthyProviders.length === 0) {
    return providerWeights[0].provider;
  }

  // Select provider that was used least recently
  const leastUsed = healthyProviders.reduce((least, current) =>
    current.lastUsed < least.lastUsed ? current : least
  );

  updateProviderUsage(leastUsed.provider);
  return leastUsed.provider;
}

function updateProviderUsage(provider: 'aws' | 'azure' | 'gcp'): void {
  const providerWeight = providerWeights.find(p => p.provider === provider);
  if (providerWeight) {
    providerWeight.lastUsed = new Date();
  }
}

export function reportProviderSuccess(provider: 'aws' | 'azure' | 'gcp'): void {
  const providerWeight = providerWeights.find(p => p.provider === provider);
  if (providerWeight) {
    providerWeight.consecutiveFailures = 0;
    providerWeight.healthScore = Math.min(100, providerWeight.healthScore * HEALTH_RECOVERY_RATE);
  }
}

export function reportProviderFailure(provider: 'aws' | 'azure' | 'gcp'): void {
  const providerWeight = providerWeights.find(p => p.provider === provider);
  if (providerWeight) {
    providerWeight.consecutiveFailures++;
    providerWeight.healthScore = Math.max(0, providerWeight.healthScore * HEALTH_DECAY_RATE);
  }
}

export function getProviderStats(): ProviderWeight[] {
  return [...providerWeights];
}

// Cloud monitoring metrics
export interface CloudMetrics {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  uptime: number;
  errorRate: number;
  lastChecked: Date;
}

export async function getCloudMetrics(): Promise<CloudMetrics[]> {
  const metrics: CloudMetrics[] = [];

  for (const provider of providers) {
    try {
      const metric = await checkProviderHealth(provider);
      metrics.push(metric);
    } catch (error) {
      console.error(`Error checking ${provider} health:`, error);
      metrics.push({
        provider,
        status: 'unhealthy',
        latency: 0,
        uptime: 0,
        errorRate: 1,
        lastChecked: new Date(),
      });
    }
  }

  return metrics;
}

async function checkProviderHealth(provider: string): Promise<CloudMetrics> {
  const startTime = Date.now();

  try {
    switch (provider) {
      case 'aws':
        await checkAWSHealth();
        break;
      case 'azure':
        await checkAzureHealth();
        break;
      case 'gcp':
        await checkGCPHealth();
        break;
    }

    const latency = Date.now() - startTime;
    return {
      provider,
      status: 'healthy',
      latency,
      uptime: 0.99, // Mock uptime - in real implementation, track actual uptime
      errorRate: 0.01, // Mock error rate
      lastChecked: new Date(),
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      provider,
      status: 'degraded',
      latency,
      uptime: 0.95,
      errorRate: 0.05,
      lastChecked: new Date(),
    };
  }
}

async function checkAWSHealth(): Promise<void> {
  // Simple health check - try to list buckets (will fail if credentials are invalid)
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }
  // In a real implementation, you might do a lightweight operation
  // For now, just check if credentials are present
}

async function checkAzureHealth(): Promise<void> {
  // Check if Azure connection string is configured
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('Azure storage connection string not configured');
  }
  // In a real implementation, you might try to list containers
}

async function checkGCPHealth(): Promise<void> {
  // Check if GCP credentials are configured
  if (!process.env.GCP_PROJECT_ID) {
    throw new Error('GCP project ID not configured');
  }
  // In a real implementation, you might try to list buckets
}
