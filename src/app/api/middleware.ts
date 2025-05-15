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
export function applyMiddleware(
  middlewares: ((request: NextRequest) => Promise<NextResponse | null>)[],
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Run each middleware in sequence
    for (const middleware of middlewares) {
      const result = await middleware(request);
      // If middleware returns a response, return it immediately
      if (result) {
        return result;
      }
    }

    // If all middleware pass, call the handler
    return handler(request);
  };
}
