import { NextResponse } from 'next/server';

/**
 * Health check endpoint
 * This route is not traced by OpenTelemetry (excluded in middleware)
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}