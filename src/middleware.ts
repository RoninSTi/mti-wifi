/**
 * Next.js middleware for request/response telemetry
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api';

// Get a tracer instance
const tracer = trace.getTracer('nextjs-middleware');

/**
 * Extract trace context from headers
 *
 * @param req - NextRequest object
 * @returns Context object with trace information
 */
function extractContextFromHeaders(req: NextRequest) {
  // Create a carrier from the request headers
  const carrier: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    carrier[key] = value;
  });

  // Extract the context
  return propagation.extract(context.active(), carrier);
}

/**
 * Inject trace context into response headers
 *
 * @param ctx - Context object with trace information
 * @param res - NextResponse object
 * @returns Response with trace headers
 */
function injectContextIntoHeaders(ctx: ReturnType<typeof context.active>, res: NextResponse) {
  const carrier: Record<string, string> = {};

  // Inject the context into the carrier
  propagation.inject(ctx, carrier);

  // Add trace headers to the response
  Object.entries(carrier).forEach(([key, value]) => {
    res.headers.set(key, value);
  });

  return res;
}

/**
 * Middleware function for OpenTelemetry instrumentation
 *
 * @param req - NextRequest object
 * @returns Instrumented response
 */
export async function middleware(req: NextRequest) {
  // Skip tracing for static assets and non-API routes
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.includes('.') ||
    req.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Extract context from incoming request
  const extractedContext = extractContextFromHeaders(req);

  // Create span for this request
  return await context.with(extractedContext, async () => {
    const pathname = req.nextUrl.pathname;
    const method = req.method;

    return tracer.startActiveSpan(`${method} ${pathname}`, async span => {
      try {
        // Add request details to span
        span.setAttribute('http.method', method);
        span.setAttribute('http.url', req.url);
        span.setAttribute('http.target', pathname);
        span.setAttribute('http.user_agent', req.headers.get('user-agent') || '');

        // Continue with the request
        const response = NextResponse.next();

        // Add response to span
        span.setAttribute('http.status_code', response.status);
        span.setStatus({ code: response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });

        // Inject the trace context into the response
        return injectContextIntoHeaders(context.active(), response);
      } catch (error: unknown) {
        // Record error in span
        if (error instanceof Error) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Unknown error occurred',
          });
        }

        // Continue with the request without breaking the app
        return NextResponse.next();
      } finally {
        // End the span
        span.end();
      }
    });
  });
}

/**
 * Configure which paths this middleware applies to
 */
export const config = {
  matcher: [
    // API routes
    '/api/:path*',

    // Exclude static files and API health check
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
