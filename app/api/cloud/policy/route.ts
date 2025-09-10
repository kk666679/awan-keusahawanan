import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// In-memory policy storage (in production, use database)
let policies = [
  {
    id: 'max-storage-limit',
    name: 'Maximum Storage Limit',
    provider: 'all',
    condition: 'storageUsage > 80%',
    action: 'alert',
    enabled: true,
  },
  {
    id: 'cpu-threshold',
    name: 'CPU Usage Threshold',
    provider: 'all',
    condition: 'cpuUsage > 70%',
    action: 'scale_up',
    enabled: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Token tidak disediakan" }, { status: 401 });
    }

    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 401 });
    }

    return NextResponse.json({
      status: 'success',
      data: policies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Token tidak disediakan" }, { status: 401 });
    }

    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 401 });
    }

    const body = await request.json();
    const { name, provider, condition, action, enabled = true } = body;

    if (!name || !provider || !condition || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: name, provider, condition, action' },
        { status: 400 }
      );
    }

    const newPolicy = {
      id: `policy-${Date.now()}`,
      name,
      provider,
      condition,
      action,
      enabled,
    };

    policies.push(newPolicy);

    return NextResponse.json({
      status: 'success',
      data: newPolicy,
      message: 'Policy created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Token tidak disediakan" }, { status: 401 });
    }

    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    const policyIndex = policies.findIndex(p => p.id === id);
    if (policyIndex === -1) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    policies[policyIndex] = { ...policies[policyIndex], ...updates };

    return NextResponse.json({
      status: 'success',
      data: policies[policyIndex],
      message: 'Policy updated successfully'
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Token tidak disediakan" }, { status: 401 });
    }

    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    const policyIndex = policies.findIndex(p => p.id === id);
    if (policyIndex === -1) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    const deletedPolicy = policies.splice(policyIndex, 1)[0];

    return NextResponse.json({
      status: 'success',
      data: deletedPolicy,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json(
      { error: 'Failed to delete policy' },
      { status: 500 }
    );
  }
}
