import { NextRequest, NextResponse } from 'next/server';
import { getCloudMetrics } from '@/lib/cloud';

export async function GET(request: NextRequest) {
  try {
    const metrics = await getCloudMetrics();
    return NextResponse.json({
      status: 'success',
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching cloud metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cloud metrics' },
      { status: 500 }
    );
  }
}
