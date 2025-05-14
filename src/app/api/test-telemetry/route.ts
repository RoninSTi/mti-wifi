/**
 * Test API endpoint for OpenTelemetry
 *
 * This endpoint demonstrates how to use custom spans and metrics
 * for API monitoring with OpenTelemetry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';

/**
 * GET handler for test-telemetry endpoint
 */
export async function GET(_request: NextRequest) {
  return await createApiSpan('test-telemetry.get', async () => {
    // Add custom attributes to the span
    addSpanAttributes({
      'custom.attribute': 'test-value',
      'request.timestamp': new Date().toISOString(),
    });

    // Simulate a database operation
    const result = await createDatabaseSpan('find', 'users', async () => {
      // Simulate database latency
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true, users: [] };
    });

    // Generate a random error (20% of the time) to demonstrate error tracing
    if (Math.random() < 0.2) {
      throw new Error('Random test error in telemetry endpoint');
    }

    // Return successful response
    return NextResponse.json({
      message: 'OpenTelemetry test endpoint',
      timestamp: new Date().toISOString(),
      result,
    });
  });
}
