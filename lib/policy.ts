import { prisma } from './db';

export interface Policy {
  id: string;
  name: string;
  description?: string;
  type: 'resource_limit' | 'access_control' | 'cost_control' | 'compliance';
  provider: 'aws' | 'azure' | 'gcp' | 'all';
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface PolicyCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface PolicyAction {
  type: 'alert' | 'block' | 'scale_up' | 'scale_down' | 'notify' | 'log';
  parameters?: Record<string, any>;
}

export interface PolicyEvaluationContext {
  userId?: string;
  provider: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  metadata?: Record<string, any>;
  metrics?: {
    cpu?: number;
    memory?: number;
    cost?: number;
    usage?: number;
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  policiesTriggered: string[];
  actions: PolicyAction[];
  reason?: string;
}

class PolicyEngine {
  private policies: Policy[] = [];
  private evaluationCache = new Map<string, { result: PolicyEvaluationResult; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.loadDefaultPolicies();
  }

  // Load default policies
  private loadDefaultPolicies(): void {
    const defaultPolicies: Omit<Policy, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'resource-limit-cpu',
        name: 'CPU Usage Limit',
        description: 'Prevent excessive CPU usage',
        type: 'resource_limit',
        provider: 'all',
        conditions: [
          {
            field: 'metrics.cpu',
            operator: 'gt',
            value: 80,
          },
        ],
        actions: [
          {
            type: 'alert',
            parameters: { severity: 'high', message: 'CPU usage exceeded 80%' },
          },
          {
            type: 'scale_up',
            parameters: { factor: 1.5 },
          },
        ],
        enabled: true,
        priority: 10,
      },
      {
        id: 'resource-limit-memory',
        name: 'Memory Usage Limit',
        description: 'Prevent excessive memory usage',
        type: 'resource_limit',
        provider: 'all',
        conditions: [
          {
            field: 'metrics.memory',
            operator: 'gt',
            value: 85,
          },
        ],
        actions: [
          {
            type: 'alert',
            parameters: { severity: 'high', message: 'Memory usage exceeded 85%' },
          },
          {
            type: 'scale_up',
            parameters: { factor: 1.2 },
          },
        ],
        enabled: true,
        priority: 10,
      },
      {
        id: 'cost-control-budget',
        name: 'Monthly Cost Budget',
        description: 'Monitor and control cloud costs',
        type: 'cost_control',
        provider: 'all',
        conditions: [
          {
            field: 'metrics.cost',
            operator: 'gt',
            value: 1000, // $1000 monthly limit
          },
        ],
        actions: [
          {
            type: 'alert',
            parameters: { severity: 'medium', message: 'Monthly cost budget exceeded' },
          },
          {
            type: 'notify',
            parameters: { channels: ['email', 'slack'] },
          },
        ],
        enabled: true,
        priority: 5,
      },
      {
        id: 'access-control-admin-only',
        name: 'Admin Only Resources',
        description: 'Restrict access to sensitive resources',
        type: 'access_control',
        provider: 'all',
        conditions: [
          {
            field: 'resourceType',
            operator: 'eq',
            value: 'admin',
          },
          {
            field: 'userId',
            operator: 'not_contains',
            value: 'admin',
          },
        ],
        actions: [
          {
            type: 'block',
            parameters: { reason: 'Access denied: Admin privileges required' },
          },
        ],
        enabled: true,
        priority: 100,
      },
    ];

    this.policies = defaultPolicies.map(policy => ({
      ...policy,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  // Evaluate policies for a given context
  async evaluatePolicies(context: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
    const cacheKey = this.generateCacheKey(context);
    const cached = this.evaluationCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }

    const result: PolicyEvaluationResult = {
      allowed: true,
      policiesTriggered: [],
      actions: [],
    };

    // Get applicable policies
    const applicablePolicies = this.getApplicablePolicies(context);

    // Sort by priority (higher priority first)
    applicablePolicies.sort((a, b) => b.priority - a.priority);

    for (const policy of applicablePolicies) {
      if (!policy.enabled) continue;

      const policyResult = this.evaluatePolicy(policy, context);
      if (policyResult.triggered) {
        result.policiesTriggered.push(policy.id);
        result.actions.push(...policy.actions);

        // If policy blocks the action, deny it
        if (policy.actions.some(action => action.type === 'block')) {
          result.allowed = false;
          result.reason = policy.actions.find(action => action.type === 'block')?.parameters?.reason ||
                         `Policy violation: ${policy.name}`;
          break;
        }
      }
    }

    // Cache the result
    this.evaluationCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  // Evaluate a single policy
  private evaluatePolicy(policy: Policy, context: PolicyEvaluationContext): { triggered: boolean } {
    // Check if all conditions are met
    for (const condition of policy.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return { triggered: false };
      }
    }

    return { triggered: true };
  }

  // Evaluate a single condition
  private evaluateCondition(condition: PolicyCondition, context: PolicyEvaluationContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' &&
               fieldValue > condition.value;
      case 'lt':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' &&
               fieldValue < condition.value;
      case 'gte':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' &&
               fieldValue >= condition.value;
      case 'lte':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' &&
               fieldValue <= condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && typeof condition.value === 'string' &&
               fieldValue.includes(condition.value);
      case 'not_contains':
        return typeof fieldValue === 'string' && typeof condition.value === 'string' &&
               !fieldValue.includes(condition.value);
      default:
        return false;
    }
  }

  // Get field value from context
  private getFieldValue(field: string, context: PolicyEvaluationContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // Get applicable policies for context
  private getApplicablePolicies(context: PolicyEvaluationContext): Policy[] {
    return this.policies.filter(policy =>
      policy.provider === 'all' || policy.provider === context.provider
    );
  }

  // Generate cache key
  private generateCacheKey(context: PolicyEvaluationContext): string {
    return `${context.provider}-${context.resourceType}-${context.action}-${JSON.stringify(context.metadata)}`;
  }

  // CRUD operations for policies
  async createPolicy(policyData: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Policy> {
    const policy: Policy = {
      ...policyData,
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.push(policy);

    // Clear cache
    this.evaluationCache.clear();

    return policy;
  }

  async updatePolicy(id: string, updates: Partial<Omit<Policy, 'id' | 'createdAt'>>): Promise<Policy | null> {
    const index = this.policies.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.policies[index] = {
      ...this.policies[index],
      ...updates,
      updatedAt: new Date(),
    };

    // Clear cache
    this.evaluationCache.clear();

    return this.policies[index];
  }

  async deletePolicy(id: string): Promise<boolean> {
    const index = this.policies.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.policies.splice(index, 1);

    // Clear cache
    this.evaluationCache.clear();

    return true;
  }

  getPolicies(filter?: { type?: string; provider?: string; enabled?: boolean }): Policy[] {
    let filtered = this.policies;

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(p => p.type === filter.type);
      }
      if (filter.provider) {
        filtered = filtered.filter(p => p.provider === filter.provider || p.provider === 'all');
      }
      if (filter.enabled !== undefined) {
        filtered = filtered.filter(p => p.enabled === filter.enabled);
      }
    }

    return filtered.sort((a, b) => b.priority - a.priority);
  }

  getPolicyById(id: string): Policy | null {
    return this.policies.find(p => p.id === id) || null;
  }

  // Get policy statistics
  getPolicyStats(): {
    totalPolicies: number;
    enabledPolicies: number;
    policiesByType: Record<string, number>;
    policiesByProvider: Record<string, number>;
  } {
    const enabledPolicies = this.policies.filter(p => p.enabled);

    const policiesByType = this.policies.reduce((acc, policy) => {
      acc[policy.type] = (acc[policy.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const policiesByProvider = this.policies.reduce((acc, policy) => {
      acc[policy.provider] = (acc[policy.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPolicies: this.policies.length,
      enabledPolicies: enabledPolicies.length,
      policiesByType,
      policiesByProvider,
    };
  }
}

// Export singleton instance
export const policyEngine = new PolicyEngine();

// Export as default
export default policyEngine;
