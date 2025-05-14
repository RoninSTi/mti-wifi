import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';

/**
 * Example API route with OpenTelemetry instrumentation
 *
 * This demonstrates how to add tracing to your API routes
 * using the OpenTelemetry utilities
 */
export async function GET(request: NextRequest) {
  // Create a span for this API endpoint
  return await createApiSpan('example.get', async () => {
    try {
      // Extract query parameters
      const { searchParams } = new URL(request.url);
      const param = searchParams.get('param');

      // Add the param to the span for better debugging
      addSpanAttributes({ 'request.param': param || 'none' });

      // Simulate connecting to the database
      let result;
      try {
        await connectToDatabase();

        // Execute database query inside a database span
        result = await createDatabaseSpan('find', 'users', async () => {
          // Simulate database latency
          await new Promise(resolve => setTimeout(resolve, 50));

          // Mock database result
          return [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' },
          ];
        });
      } catch (error: unknown) {
        console.error('Database error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        return NextResponse.json(
          { error: 'Database error', message: errorMessage },
          { status: 500 }
        );
      }

      // Add result count to span attributes
      addSpanAttributes({ 'result.count': result.length });

      // Success response
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (error: unknown) {
      console.error('API error:', error);

      // Error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        { error: 'Internal server error', message: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * Example POST handler with OpenTelemetry instrumentation
 */
export async function POST(request: NextRequest) {
  return await createApiSpan('example.post', async () => {
    try {
      // Parse request body
      const body = await request.json();

      // Add request data to span
      addSpanAttributes({
        'request.body.size': JSON.stringify(body).length,
      });

      // Simulate database operation
      const result = await createDatabaseSpan('insert', 'users', async () => {
        // Simulate database latency
        await new Promise(resolve => setTimeout(resolve, 75));

        // Mock database result
        return { id: 3, ...body };
      });

      // Success response
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error: unknown) {
      console.error('API error:', error);

      // Error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return NextResponse.json(
        { error: 'Internal server error', message: errorMessage },
        { status: 500 }
      );
    }
  });
}
