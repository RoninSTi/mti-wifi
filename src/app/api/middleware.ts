import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * Middleware for checking authentication in API routes
 *
 * @param _request The incoming request (not used directly)
 * @returns Response or null to continue
 */
export async function authMiddleware(_request: NextRequest): Promise<NextResponse | null> {
  // Get the server session
  const session = await getServerSession(authOptions);

  // If no session, return 401 Unauthorized
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  // Otherwise, continue to the next middleware/handler
  return null;
}

/**
 * Apply multiple middleware to a handler function
 *
 * @param middlewares Array of middleware functions to apply
 * @param handler The handler function to wrap
 * @returns A new handler function with middleware applied
 */
// Define a specific context type for all route handlers
// Define a consistent interface for route context
export interface RouteContext {
  params: Record<string, string>;
}

// Define the raw context type from Next.js that can have Promise params
export interface RawRouteContext {
  params: Record<string, string> | Promise<Record<string, string>>;
}

export function applyMiddleware(
  middlewares: ((request: NextRequest) => Promise<NextResponse | null>)[],
  handler: (request: NextRequest, context: RouteContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, contextRaw: unknown): Promise<NextResponse> => {
    // Run each middleware in sequence
    for (const middleware of middlewares) {
      const result = await middleware(request);
      // If middleware returns a response, return it immediately
      if (result) {
        return result;
      }
    }

    // Normalize the context to ensure params is a plain object, not a Promise
    // Safely access params from the raw context with proper type checking
    const rawParams =
      contextRaw && typeof contextRaw === 'object' && 'params' in contextRaw
        ? (contextRaw as RawRouteContext).params
        : {};

    // Process params to ensure we have a Record<string, string>
    const context: RouteContext = {
      params: await Promise.resolve(rawParams)
        .then(params => {
          if (params && typeof params === 'object') {
            return params as Record<string, string>;
          }
          return {};
        })
        .catch(() => ({})),
    };

    console.log('Normalized context:', context);

    // If all middleware pass, call the handler with the context
    return handler(request, context);
  };
}
