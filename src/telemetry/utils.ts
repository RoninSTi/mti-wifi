/**
 * OpenTelemetry utilities for creating custom spans and metrics
 */

import { trace, context, SpanStatusCode, SpanKind, metrics } from '@opentelemetry/api';
import { SemanticAttributes, DbSystemValues } from '@opentelemetry/semantic-conventions';

// Get a tracer instance
const tracer = trace.getTracer('nextjs-starter');

// Get a meter instance for metrics
const meter = metrics.getMeter('nextjs-starter');

// Create a counter for API endpoint calls
export const apiCallCounter = meter.createCounter('api.calls', {
  description: 'Number of calls to API endpoints',
  unit: '1',
});

/**
 * Create a custom span for any operation
 *
 * @param name - Name of the span
 * @param fn - Function to execute within the span
 * @param kind - Kind of span (default: internal)
 * @param attributes - Span attributes
 * @returns Result of the function execution
 */
export async function createSpan<T>(
  name: string,
  fn: () => Promise<T>,
  kind: SpanKind = SpanKind.INTERNAL,
  attributes: Record<string, string | number | boolean | string[] | number[]> = {}
): Promise<T> {
  const currentContext = context.active();

  // Create a span
  const span = tracer.startSpan(name, { kind, attributes }, currentContext);

  // Set context with active span
  const contextWithSpan = trace.setSpan(currentContext, span);

  try {
    // Run within the context that has the active span
    return await context.with(contextWithSpan, async () => {
      try {
        // Execute the function within the span
        const result = await fn();

        // Set span status to success
        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      } catch (error: unknown) {
        // Record error and set span status to error
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });

        // Re-throw the error
        throw error;
      }
    });
  } finally {
    // End the span
    span.end();
  }
}

/**
 * Create a custom span for database operations
 *
 * @param operation - Database operation (e.g., 'find', 'update')
 * @param collection - MongoDB collection name
 * @param fn - Function to execute within the span
 * @returns Result of the function execution
 */
export async function createDatabaseSpan<T>(
  operation: string,
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  return createSpan(`database.${collection}.${operation}`, fn, SpanKind.CLIENT, {
    [SemanticAttributes.DB_SYSTEM]: DbSystemValues.MONGODB,
    [SemanticAttributes.DB_OPERATION]: operation,
    [SemanticAttributes.DB_NAME]: collection, // Use DB_NAME for collection name
  });
}

/**
 * Create a custom span for API handlers
 *
 * @param endpoint - API endpoint name
 * @param fn - Function to execute within the span
 * @returns Result of the function execution
 */
export async function createApiSpan<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
  // Increment the counter for this API endpoint
  apiCallCounter.add(1, { endpoint });

  return createSpan(`api.${endpoint}`, fn, SpanKind.SERVER, {
    [SemanticAttributes.HTTP_ROUTE]: endpoint,
  });
}

/**
 * Get the current active span
 * @returns The current active span, or undefined if not in a span context
 */
export function getCurrentSpan() {
  return trace.getSpan(context.active());
}

/**
 * Add attributes to the current span
 *
 * @param attributes - Key-value pairs to add as span attributes
 */
export function addSpanAttributes(
  attributes: Record<string, string | number | boolean | string[] | number[]>
) {
  const currentSpan = getCurrentSpan();
  if (currentSpan) {
    Object.entries(attributes).forEach(([key, value]) => {
      currentSpan.setAttribute(key, value);
    });
  }
}

/**
 * Record an exception in the current span
 *
 * @param error - Error to record
 */
export function recordSpanException(error: Error) {
  const currentSpan = getCurrentSpan();
  if (currentSpan) {
    currentSpan.recordException(error);
    currentSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}
