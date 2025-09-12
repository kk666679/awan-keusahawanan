import { logger } from './logging';
import { prisma } from './db';

export interface MetricData {
  provider: 'aws' | 'azure' | 'gcp';
  resourceType: 'compute' | 'storage' | 'network' | 'database';
  resourceId: string;
  metricName: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metricName: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // in minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[]; // email, slack, webhook, etc.
  lastTriggered?: Date;
  cooldownPeriod: number; // in minutes
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  createdAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metricData: MetricData;
  channels: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  collectionInterval: number; // in milliseconds
  retentionPeriod: number; // in days
  alertRules: AlertRule[];
  notificationChannels: {
    email?: {
      enabled: boolean;
      smtpConfig: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      recipients: string[];
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
  };
}

class MonitoringService {
  private config: MonitoringConfig;
  private collectionInterval: NodeJS.Timeout | null = null;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();

  constructor() {
    this.config = {
      enabled: true,
      collectionInterval: 60 * 1000, // 1 minute
      retentionPeriod: 30, // 30 days
      alertRules: [],
      notificationChannels: {},
    };

    this.initializeDefaultRules();
  }

  // Initialize default alert rules
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'CPU usage exceeds 80%',
        metricName: 'cpu_usage',
        condition: 'gt',
        threshold: 80,
        duration: 5,
        severity: 'high',
        enabled: true,
        channels: ['email', 'slack'],
        cooldownPeriod: 10,
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85%',
        metricName: 'memory_usage',
        condition: 'gt',
        threshold: 85,
        duration: 5,
        severity: 'high',
        enabled: true,
        channels: ['email'],
        cooldownPeriod: 10,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        metricName: 'error_rate',
        condition: 'gt',
        threshold: 5,
        duration: 10,
        severity: 'critical',
        enabled: true,
        channels: ['email', 'slack', 'webhook'],
        cooldownPeriod: 5,
      },
      {
        id: 'low-availability',
        name: 'Low Availability',
        description: 'Service availability below 99%',
        metricName: 'availability',
        condition: 'lt',
        threshold: 99,
        duration: 15,
        severity: 'critical',
        enabled: true,
        channels: ['email', 'slack'],
        cooldownPeriod: 5,
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  // Start monitoring service
  start(): void {
    if (this.collectionInterval) {
      logger.warn('Monitoring service is already running');
      return;
    }

    logger.info('Starting monitoring service...');
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);
  }

  // Stop monitoring service
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.info('Monitoring service stopped');
    }
  }

  // Collect metrics from all providers
  private async collectMetrics(): Promise<void> {
    try {
      const providers: ('aws' | 'azure' | 'gcp')[] = ['aws', 'azure', 'gcp'];

      for (const provider of providers) {
        await this.collectProviderMetrics(provider);
      }

      // Clean up old metrics
      await this.cleanupOldMetrics();

      // Evaluate alert rules
      await this.evaluateAlertRules();

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error during metric collection');
      logger.error('Error during metric collection', errorObj);
    }
  }

  // Collect metrics from a specific provider
  private async collectProviderMetrics(provider: 'aws' | 'azure' | 'gcp'): Promise<void> {
    try {
      // Simulate metric collection
      // In real implementation, this would call cloud provider APIs
      const metrics = await this.simulateMetricCollection(provider);

      // Store metrics in database
      for (const metric of metrics) {
        await this.storeMetric(metric);
      }

      logger.debug(`Collected ${metrics.length} metrics from ${provider}`);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(`Unknown error collecting metrics from ${provider}`);
      logger.error(`Error collecting metrics from ${provider}`, errorObj);
    }
  }

  // Simulate metric collection (replace with real cloud provider calls)
  private async simulateMetricCollection(provider: 'aws' | 'azure' | 'gcp'): Promise<MetricData[]> {
    const metrics: MetricData[] = [];

    // Simulate different types of metrics
    const metricTypes = [
      { name: 'cpu_usage', unit: 'percent', min: 10, max: 95 },
      { name: 'memory_usage', unit: 'percent', min: 20, max: 90 },
      { name: 'network_in', unit: 'bytes', min: 1000, max: 1000000 },
      { name: 'network_out', unit: 'bytes', min: 1000, max: 1000000 },
      { name: 'disk_read', unit: 'bytes', min: 0, max: 100000 },
      { name: 'disk_write', unit: 'bytes', min: 0, max: 100000 },
      { name: 'error_rate', unit: 'percent', min: 0, max: 10 },
      { name: 'response_time', unit: 'milliseconds', min: 50, max: 5000 },
      { name: 'availability', unit: 'percent', min: 95, max: 100 },
    ];

    for (const type of metricTypes) {
      const value = Math.random() * (type.max - type.min) + type.min;

      metrics.push({
        provider,
        resourceType: 'compute', // Could be dynamic based on actual resources
        resourceId: `${provider}-instance-${Math.floor(Math.random() * 10) + 1}`,
        metricName: type.name,
        value: Math.round(value * 100) / 100,
        unit: type.unit,
        timestamp: new Date(),
        tags: {
          environment: 'production',
          region: `${provider}-us-east-1`,
        },
      });
    }

    return metrics;
  }

  // Store metric in database
  private async storeMetric(metric: MetricData): Promise<void> {
    try {
      await prisma.metric.create({
        data: {
          provider: metric.provider,
          resourceType: metric.resourceType,
          resourceId: metric.resourceId,
          metricName: metric.metricName,
          value: metric.value,
          unit: metric.unit,
          timestamp: metric.timestamp,
          tags: metric.tags || {},
        },
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error storing metric');
      logger.error('Error storing metric', errorObj);
    }
  }

  // Clean up old metrics based on retention period
  private async cleanupOldMetrics(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod);

      const deletedCount = await prisma.metric.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      if (deletedCount.count > 0) {
        logger.info(`Cleaned up ${deletedCount.count} old metrics`);
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error cleaning up old metrics');
      logger.error('Error cleaning up old metrics', errorObj);
    }
  }

  // Evaluate alert rules against recent metrics
  private async evaluateAlertRules(): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(`Unknown error evaluating rule ${rule.id}`);
        logger.error(`Error evaluating rule ${rule.id}`, errorObj);
      }
    }
  }

  // Evaluate a specific alert rule
  private async evaluateRule(rule: AlertRule): Promise<void> {
    const durationMs = rule.duration * 60 * 1000;
    const startTime = new Date(Date.now() - durationMs);

    // Get recent metrics for this rule
    const recentMetrics = await prisma.metric.findMany({
      where: {
        metricName: rule.metricName,
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 10, // Last 10 data points
    });

    if (recentMetrics.length === 0) return;

    // Check if condition is met
    const isConditionMet = this.checkCondition(rule, recentMetrics);

    if (isConditionMet) {
      // Check cooldown period
      const now = new Date();
      const lastTriggered = rule.lastTriggered;

      if (!lastTriggered || (now.getTime() - lastTriggered.getTime()) > (rule.cooldownPeriod * 60 * 1000)) {
        await this.triggerAlert(rule, recentMetrics[0]);
        rule.lastTriggered = now;
      }
    } else {
      // Check if there's an active alert to resolve
      const activeAlert = Array.from(this.activeAlerts.values())
        .find(alert => alert.ruleId === rule.id && alert.status === 'active');

      if (activeAlert) {
        await this.resolveAlert(activeAlert);
      }
    }
  }

  // Check if alert condition is met
  private checkCondition(rule: AlertRule, metrics: any[]): boolean {
    const values = metrics.map((m: any) => m.value);
    const avgValue = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;

    switch (rule.condition) {
      case 'gt':
        return avgValue > rule.threshold;
      case 'lt':
        return avgValue < rule.threshold;
      case 'eq':
        return avgValue === rule.threshold;
      case 'gte':
        return avgValue >= rule.threshold;
      case 'lte':
        return avgValue <= rule.threshold;
      default:
        return false;
    }
  }

  // Trigger an alert
  private async triggerAlert(rule: AlertRule, metricData: any): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      message: `${rule.name}: ${rule.description} (Current: ${metricData.value}${metricData.unit})`,
      severity: rule.severity,
      status: 'active',
      createdAt: new Date(),
      metricData: {
        provider: metricData.provider as 'aws' | 'azure' | 'gcp',
        resourceType: metricData.resourceType as 'compute' | 'storage' | 'network' | 'database',
        resourceId: metricData.resourceId,
        metricName: metricData.metricName,
        value: metricData.value,
        unit: metricData.unit,
        timestamp: metricData.timestamp,
        tags: metricData.tags as Record<string, string>,
      },
      channels: rule.channels,
    };

    this.activeAlerts.set(alert.id, alert);

    // Store alert in database
    try {
      await prisma.alert.create({
        data: {
          id: alert.id,
          ruleId: alert.ruleId,
          ruleName: alert.ruleName,
          message: alert.message,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.createdAt,
          metricData: {
            ...alert.metricData,
            timestamp: alert.metricData.timestamp.toISOString(),
          },
          channels: alert.channels,
        },
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error storing alert');
      logger.error('Error storing alert', errorObj);
    }

    // Send notifications
    await this.sendNotifications(alert);

    logger.warn(`Alert triggered: ${alert.message}`, {
      ruleId: rule.id,
      severity: rule.severity,
      channels: rule.channels,
    });
  }

  // Resolve an alert
  private async resolveAlert(alert: Alert): Promise<void> {
    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    // Update in database
    try {
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'resolved',
          resolvedAt: alert.resolvedAt,
        },
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error updating alert');
      logger.error('Error updating alert', errorObj);
    }

    // Send resolution notification
    await this.sendResolutionNotification(alert);

    this.activeAlerts.delete(alert.id);

    logger.info(`Alert resolved: ${alert.message}`);
  }

  // Send alert notifications
  private async sendNotifications(alert: Alert): Promise<void> {
    for (const channel of alert.channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(alert);
            break;
          case 'slack':
            await this.sendSlackNotification(alert);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert);
            break;
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(`Unknown error sending ${channel} notification`);
        logger.error(`Error sending ${channel} notification`, errorObj);
      }
    }
  }

  // Send email notification
  private async sendEmailNotification(alert: Alert): Promise<void> {
    const emailConfig = this.config.notificationChannels.email;
    if (!emailConfig?.enabled) return;

    // Simulate email sending
    logger.info(`Sending email notification: ${alert.message}`, {
      recipients: emailConfig.recipients,
      severity: alert.severity,
    });
  }

  // Send Slack notification
  private async sendSlackNotification(alert: Alert): Promise<void> {
    const slackConfig = this.config.notificationChannels.slack;
    if (!slackConfig?.enabled) return;

    // Simulate Slack notification
    logger.info(`Sending Slack notification: ${alert.message}`, {
      channel: slackConfig.channel,
      severity: alert.severity,
    });
  }

  // Send webhook notification
  private async sendWebhookNotification(alert: Alert): Promise<void> {
    const webhookConfig = this.config.notificationChannels.webhook;
    if (!webhookConfig?.enabled) return;

    // Simulate webhook call
    logger.info(`Sending webhook notification: ${alert.message}`, {
      url: webhookConfig.url,
      severity: alert.severity,
    });
  }

  // Send resolution notification
  private async sendResolutionNotification(alert: Alert): Promise<void> {
    // Similar to sendNotifications but for resolution
    logger.info(`Alert resolved notification: ${alert.message}`);
  }

  // Get current metrics
  async getMetrics(
    provider?: 'aws' | 'azure' | 'gcp',
    metricName?: string,
    startTime?: Date,
    endTime?: Date,
    limit = 100
  ): Promise<MetricData[]> {
    const where: any = {};

    if (provider) where.provider = provider;
    if (metricName) where.metricName = metricName;
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) where.timestamp.gte = startTime;
      if (endTime) where.timestamp.lte = endTime;
    }

    const metrics = await prisma.metric.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return metrics.map((m: any) => ({
      provider: m.provider as 'aws' | 'azure' | 'gcp',
      resourceType: m.resourceType as 'compute' | 'storage' | 'network' | 'database',
      resourceId: m.resourceId,
      metricName: m.metricName,
      value: m.value,
      unit: m.unit,
      timestamp: m.timestamp,
      tags: m.tags as Record<string, string>,
    }));
  }

  // Get active alerts
  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values());
  }

  // Get alert history
  async getAlertHistory(
    startTime?: Date,
    endTime?: Date,
    severity?: 'low' | 'medium' | 'high' | 'critical',
    limit = 50
  ): Promise<Alert[]> {
    const where: any = {};

    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.gte = startTime;
      if (endTime) where.createdAt.lte = endTime;
    }
    if (severity) where.severity = severity;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return alerts.map((a: any) => ({
      id: a.id,
      ruleId: a.ruleId,
      ruleName: a.ruleName,
      message: a.message,
      severity: a.severity as 'low' | 'medium' | 'high' | 'critical',
      status: a.status as 'active' | 'resolved' | 'acknowledged',
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt || undefined,
      acknowledgedAt: a.acknowledgedAt || undefined,
      acknowledgedBy: a.acknowledgedBy || undefined,
      metricData: a.metricData as MetricData,
      channels: a.channels as string[],
    }));
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found or not active');
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    // Update in database
    try {
      await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'acknowledged',
          acknowledgedAt: alert.acknowledgedAt,
          acknowledgedBy: alert.acknowledgedBy,
        },
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error acknowledging alert');
      logger.error('Error acknowledging alert', errorObj);
    }

    logger.info(`Alert acknowledged by ${userId}: ${alert.message}`);
  }

  // Update monitoring configuration
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Monitoring configuration updated', { config: this.config });
  }

  // Get monitoring status
  getStatus(): {
    enabled: boolean;
    activeAlerts: number;
    totalRules: number;
    enabledRules: number;
    lastCollectionTime?: Date;
  } {
    return {
      enabled: this.config.enabled,
      activeAlerts: this.activeAlerts.size,
      totalRules: this.alertRules.size,
      enabledRules: Array.from(this.alertRules.values()).filter(r => r.enabled).length,
    };
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export default
export default monitoringService;
