import { getCloudMetrics, getProviderStats, reportProviderSuccess, reportProviderFailure } from './cloud';
import { monitoringService } from './monitoring';
import { policyEngine } from './policy';
import { logger } from './logging';

export interface ScalingConfig {
  enabled: boolean;
  checkInterval: number; // in milliseconds
  cooldownPeriod: number; // in milliseconds
  scaleUpThreshold: {
    cpu: number;
    memory: number;
    latency: number;
  };
  scaleDownThreshold: {
    cpu: number;
    memory: number;
    latency: number;
  };
  scaleUpFactor: number;
  scaleDownFactor: number;
  maxInstances: number;
  minInstances: number;
  predictiveScaling: boolean;
  autoScaling: boolean;
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'no_action';
  provider: string;
  reason: string;
  confidence: number; // 0-1
  metrics: {
    cpu: number;
    memory: number;
    latency: number;
    currentInstances: number;
  };
  recommendedInstances: number;
  timestamp: Date;
}

export interface ScalingHistory {
  id: string;
  decision: ScalingDecision;
  executed: boolean;
  executionTime?: number;
  success?: boolean;
  error?: string;
  timestamp: Date;
}

class ScalingEngine {
  private config: ScalingConfig;
  private lastScalingAction = new Map<string, number>();
  private scalingHistory: ScalingHistory[] = [];
  private scalingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enabled: true,
      checkInterval: 60000, // 1 minute
      cooldownPeriod: 300000, // 5 minutes
      scaleUpThreshold: {
        cpu: 70,
        memory: 80,
        latency: 1000,
      },
      scaleDownThreshold: {
        cpu: 30,
        memory: 40,
        latency: 200,
      },
      scaleUpFactor: 1.5,
      scaleDownFactor: 0.7,
      maxInstances: 10,
      minInstances: 1,
      predictiveScaling: false,
      autoScaling: false,
    };
  }

  // Start scaling engine
  start(): void {
    if (this.scalingInterval) {
      logger.warn('Scaling engine is already running');
      return;
    }

    logger.info('Starting scaling engine...');
    this.scalingInterval = setInterval(() => {
      this.performScalingCheck();
    }, this.config.checkInterval);
  }

  // Stop scaling engine
  stop(): void {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
      logger.info('Scaling engine stopped');
    }
  }

  // Update scaling configuration
  updateConfig(newConfig: Partial<ScalingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Scaling configuration updated:', this.config);
  }

  // Perform scaling check
  private async performScalingCheck(): Promise<void> {
    try {
      const metrics = await getCloudMetrics();
      const providerStats = getProviderStats();

      for (const metric of metrics) {
        const decision = await this.makeScalingDecision(metric, providerStats);

        if (decision.action !== 'no_action') {
          logger.info(`Scaling decision for ${decision.provider}: ${decision.action}`, {
            reason: decision.reason,
            confidence: decision.confidence,
            metrics: decision.metrics,
            recommendedInstances: decision.recommendedInstances,
          });

          // Execute scaling if auto-scaling is enabled
          if (this.config.autoScaling) {
            await this.executeScaling(decision);
          } else {
            // Log scaling recommendation
            logger.warn(`Scaling recommendation: ${decision.action} for ${decision.provider}`, {
              reason: decision.reason,
              confidence: decision.confidence,
              metrics: decision.metrics,
              recommendedInstances: decision.recommendedInstances,
            });
          }
        }
      }

      // Clean up old history
      this.cleanupHistory();

    } catch (error) {
      logger.error('Error during scaling check:', error as Error);
    }
  }

  // Make scaling decision for a provider
  private async makeScalingDecision(
    metric: any,
    providerStats: any[]
  ): Promise<ScalingDecision> {
    const provider = metric.provider;
    const providerStat = providerStats.find(p => p.provider === provider);

    if (!providerStat) {
      return {
        action: 'no_action',
        provider,
        reason: 'No provider statistics available',
        confidence: 0,
        metrics: {
          cpu: 0,
          memory: 0,
          latency: metric.latency,
          currentInstances: 1,
        },
        recommendedInstances: 1,
        timestamp: new Date(),
      };
    }

    const currentInstances = providerStat.consecutiveFailures > 0 ? 1 : 2; // Simplified
    const metrics = {
      cpu: 70, // Mock CPU usage
      memory: 75, // Mock memory usage
      latency: metric.latency,
      currentInstances,
    };

    // Check cooldown period
    const lastAction = this.lastScalingAction.get(provider);
    if (lastAction && (Date.now() - lastAction) < this.config.cooldownPeriod) {
      return {
        action: 'no_action',
        provider,
        reason: 'Cooldown period active',
        confidence: 0,
        metrics,
        recommendedInstances: currentInstances,
        timestamp: new Date(),
      };
    }

    // Evaluate scaling policies
    const policyContext = {
      provider,
      resourceType: 'compute',
      action: 'scale',
      metrics: {
        cpu: metrics.cpu,
        memory: metrics.memory,
        latency: metrics.latency,
      },
    };

    const policyResult = await policyEngine.evaluatePolicies(policyContext);

    if (!policyResult.allowed) {
      return {
        action: 'no_action',
        provider,
        reason: policyResult.reason || 'Policy violation',
        confidence: 0,
        metrics,
        recommendedInstances: currentInstances,
        timestamp: new Date(),
      };
    }

    // Determine scaling action
    let action: 'scale_up' | 'scale_down' | 'no_action' = 'no_action';
    let reason = 'Metrics within normal range';
    let confidence = 0.5;

    // Scale up conditions
    if (
      metrics.cpu > this.config.scaleUpThreshold.cpu ||
      metrics.memory > this.config.scaleUpThreshold.memory ||
      metrics.latency > this.config.scaleUpThreshold.latency
    ) {
      action = 'scale_up';
      reason = 'Resource utilization exceeded thresholds';
      confidence = 0.8;
    }
    // Scale down conditions
    else if (
      metrics.cpu < this.config.scaleDownThreshold.cpu &&
      metrics.memory < this.config.scaleDownThreshold.memory &&
      metrics.latency < this.config.scaleDownThreshold.latency &&
      currentInstances > this.config.minInstances
    ) {
      action = 'scale_down';
      reason = 'Resource utilization below thresholds';
      confidence = 0.7;
    }

    // Calculate recommended instances
    let recommendedInstances = currentInstances;
    if (action === 'scale_up') {
      recommendedInstances = Math.min(
        Math.ceil(currentInstances * this.config.scaleUpFactor),
        this.config.maxInstances
      );
    } else if (action === 'scale_down') {
      recommendedInstances = Math.max(
        Math.floor(currentInstances * this.config.scaleDownFactor),
        this.config.minInstances
      );
    }

    return {
      action,
      provider,
      reason,
      confidence,
      metrics,
      recommendedInstances,
      timestamp: new Date(),
    };
  }

  // Execute scaling action
  private async executeScaling(decision: ScalingDecision): Promise<void> {
    const historyEntry: ScalingHistory = {
      id: `scale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      decision,
      executed: false,
      timestamp: new Date(),
    };

    try {
      const startTime = Date.now();

      // Execute scaling based on provider
      switch (decision.provider) {
        case 'aws':
          await this.scaleAWS(decision);
          break;
        case 'azure':
          await this.scaleAzure(decision);
          break;
        case 'gcp':
          await this.scaleGCP(decision);
          break;
        default:
          throw new Error(`Unsupported provider: ${decision.provider}`);
      }

      const executionTime = Date.now() - startTime;

      historyEntry.executed = true;
      historyEntry.executionTime = executionTime;
      historyEntry.success = true;

      // Update last scaling action timestamp
      this.lastScalingAction.set(decision.provider, Date.now());

      // Report success
      reportProviderSuccess(decision.provider as 'aws' | 'azure' | 'gcp');

      logger.info(`Scaling executed successfully for ${decision.provider}`, {
        action: decision.action,
        executionTime,
        recommendedInstances: decision.recommendedInstances,
      });

    } catch (error) {
      const err = error as Error;
      historyEntry.success = false;
      historyEntry.error = err.message;

      // Report failure
      reportProviderFailure(decision.provider as 'aws' | 'azure' | 'gcp');

      logger.error(`Scaling execution failed for ${decision.provider}:`, err, {
        action: decision.action,
        recommendedInstances: decision.recommendedInstances,
      });
    }

    this.scalingHistory.push(historyEntry);
  }

  // Scale AWS resources
  private async scaleAWS(decision: ScalingDecision): Promise<void> {
    // Implementation would use AWS SDK to scale Auto Scaling Groups
    logger.info(`Scaling AWS resources: ${decision.action} to ${decision.recommendedInstances} instances`);
    // AWS scaling logic here
  }

  // Scale Azure resources
  private async scaleAzure(decision: ScalingDecision): Promise<void> {
    // Implementation would use Azure SDK to scale VM Scale Sets
    logger.info(`Scaling Azure resources: ${decision.action} to ${decision.recommendedInstances} instances`);
    // Azure scaling logic here
  }

  // Scale GCP resources
  private async scaleGCP(decision: ScalingDecision): Promise<void> {
    // Implementation would use GCP SDK to scale Managed Instance Groups
    logger.info(`Scaling GCP resources: ${decision.action} to ${decision.recommendedInstances} instances`);
    // GCP scaling logic here
  }

  // Manual scaling trigger
  async manualScale(provider: string, action: 'scale_up' | 'scale_down', instances?: number): Promise<void> {
    logger.info(`Manual scaling triggered for ${provider}: ${action}`, { instances });

    const metrics = await getCloudMetrics();
    const metric = metrics.find(m => m.provider === provider);

    if (!metric) {
      throw new Error(`No metrics available for provider: ${provider}`);
    }

    const decision: ScalingDecision = {
      action,
      provider,
      reason: 'Manual scaling',
      confidence: 1.0,
      metrics: {
        cpu: 50,
        memory: 50,
        latency: metric.latency,
        currentInstances: instances || 2,
      },
      recommendedInstances: instances || (action === 'scale_up' ? 3 : 1),
      timestamp: new Date(),
    };

    await this.executeScaling(decision);
  }

  // Get scaling history
  getScalingHistory(
    filter?: {
      provider?: string;
      action?: string;
      executed?: boolean;
      success?: boolean;
      limit?: number;
    }
  ): ScalingHistory[] {
    let filtered = this.scalingHistory;

    if (filter) {
      if (filter.provider) {
        filtered = filtered.filter(h => h.decision.provider === filter.provider);
      }
      if (filter.action) {
        filtered = filtered.filter(h => h.decision.action === filter.action);
      }
      if (filter.executed !== undefined) {
        filtered = filtered.filter(h => h.executed === filter.executed);
      }
      if (filter.success !== undefined) {
        filtered = filtered.filter(h => h.success === filter.success);
      }
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const limit = filter?.limit || 50;
    return filtered.slice(0, limit);
  }

  // Get scaling statistics
  getScalingStats(): {
    totalDecisions: number;
    executedDecisions: number;
    successfulExecutions: number;
    failedExecutions: number;
    decisionsByAction: Record<string, number>;
    decisionsByProvider: Record<string, number>;
    averageExecutionTime: number;
  } {
    const executedDecisions = this.scalingHistory.filter(h => h.executed);
    const successfulExecutions = executedDecisions.filter(h => h.success);
    const failedExecutions = executedDecisions.filter(h => !h.success);

    const decisionsByAction = this.scalingHistory.reduce((acc, history) => {
      acc[history.decision.action] = (acc[history.decision.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const decisionsByProvider = this.scalingHistory.reduce((acc, history) => {
      acc[history.decision.provider] = (acc[history.decision.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalExecutionTime = executedDecisions.reduce((sum, h) => sum + (h.executionTime || 0), 0);
    const averageExecutionTime = executedDecisions.length > 0 ? totalExecutionTime / executedDecisions.length : 0;

    return {
      totalDecisions: this.scalingHistory.length,
      executedDecisions: executedDecisions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      decisionsByAction,
      decisionsByProvider,
      averageExecutionTime,
    };
  }

  // Clean up old history (keep last 1000 entries)
  private cleanupHistory(): void {
    if (this.scalingHistory.length > 1000) {
      this.scalingHistory = this.scalingHistory.slice(-1000);
    }
  }
}

// Export singleton instance
export const scalingEngine = new ScalingEngine();

// Export as default
export default scalingEngine;
