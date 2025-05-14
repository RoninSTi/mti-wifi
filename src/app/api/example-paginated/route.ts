import { NextRequest, NextResponse } from 'next/server';
import { getPaginationParamsFromRequest, paginateArray } from '@/lib/pagination';
import { createApiSpan } from '@/telemetry/utils';

// Sample data for demonstration
const sampleData = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  value: Math.floor(Math.random() * 1000),
}));

/**
 * GET /api/example-paginated - Example endpoint showing array-based pagination
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional, try 'id', 'name', 'createdAt', or 'value')
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  return await createApiSpan('example.paginated', async () => {
    try {
      // Get pagination parameters from request
      const paginationParams = getPaginationParamsFromRequest(request);

      // Use array pagination helper for in-memory data
      const response = paginateArray(sampleData, paginationParams);

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error in paginated example:', error);
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
  });
}
