import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongoose';
import User from '@/models/User';
import {
  getPaginationParamsFromRequest,
  applyPaginationToMongooseQuery,
  createPaginatedResponse,
} from '@/lib/pagination';
import { createApiSpan } from '@/telemetry/utils';

/**
 * GET /api/users - Get a paginated list of users
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  return await createApiSpan('users.list', async () => {
    try {
      await connectToDatabase();

      // Get pagination parameters from request
      const paginationParams = getPaginationParamsFromRequest(request);

      // Build base query (can be extended with filters)
      const baseQuery = User.find({}, { password: 0 }); // Exclude password field

      // Apply pagination to query
      const paginatedQuery = applyPaginationToMongooseQuery(baseQuery, paginationParams);

      // Execute query to get paginated results
      const users = await paginatedQuery.exec();

      // Count total items for pagination metadata
      const totalUsers = await User.countDocuments({});

      // Create standardized response
      const response = createPaginatedResponse(users, paginationParams, totalUsers);

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
  });
}
