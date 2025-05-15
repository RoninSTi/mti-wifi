import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth-options';

/**
 * Type for the next handler function in middleware chain
 */
export type NextHandler<T = unknown> = (
  req: NextRequest,
  context: { params: Record<string, string | string[]>; session: T | null }
) => Promise<NextResponse>;

/**
 * Middleware to require authentication for API routes
 *
 * @param handler The next handler function to call if authenticated
 * @returns A handler function that checks authentication before proceeding
 */
export function withAuth<T = unknown>(handler: NextHandler<T>): NextHandler<T> {
  return async (req: NextRequest, context: { params: Record<string, string | string[]> }) => {
    // Get the server session
    const session = (await getServerSession(authOptions)) as T | null;

    // If not authenticated, return 401 Unauthorized
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Proceed with the authenticated request
    return handler(req, { ...context, session });
  };
}
