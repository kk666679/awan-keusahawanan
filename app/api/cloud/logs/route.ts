import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// In-memory log storage (in production, use a proper logging service)
let logs: Array<{
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  provider?: string;
  operation?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}> = [];

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

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'info' | 'warn' | 'error' | null;
    const provider = searchParams.get('provider');
    const limit = parseInt(searchParams.get('limit') || '100');

    let filteredLogs = logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (provider) {
      filteredLogs = filteredLogs.filter(log => log.provider === provider);
    }

    // Sort by timestamp descending and limit results
    filteredLogs = filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return NextResponse.json({
      status: 'success',
      data: filteredLogs,
      total: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
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
    const { level, message, provider, operation, metadata } = body;

    if (!level || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: level, message' },
        { status: 400 }
      );
    }

    if (!['info', 'warn', 'error'].includes(level)) {
      return NextResponse.json(
        { error: 'Invalid log level. Must be info, warn, or error' },
        { status: 400 }
      );
    }

    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      provider,
      operation,
      timestamp: new Date(),
      metadata,
    };

    logs.push(newLog);

    // Keep only the last 1000 logs to prevent memory issues
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    return NextResponse.json({
      status: 'success',
      data: newLog,
      message: 'Log entry created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating log entry:', error);
    return NextResponse.json(
      { error: 'Failed to create log entry' },
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
    const level = searchParams.get('level') as 'info' | 'warn' | 'error' | null;
    const provider = searchParams.get('provider');

    if (!level && !provider) {
      return NextResponse.json(
        { error: 'Must specify level or provider to delete logs' },
        { status: 400 }
      );
    }

    const initialLength = logs.length;
    logs = logs.filter(log => {
      if (level && log.level !== level) return true;
      if (provider && log.provider !== provider) return true;
      return false;
    });

    const deletedCount = initialLength - logs.length;

    return NextResponse.json({
      status: 'success',
      message: `Deleted ${deletedCount} log entries`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete logs' },
      { status: 500 }
    );
  }
}
