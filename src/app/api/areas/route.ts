import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Area from '@/models/Area';
import Location from '@/models/Location';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createAreaSchema, type CreateAreaInput } from './schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware, RouteContext } from '../middleware';
import {
  getPaginationParamsFromRequest,
  applyPaginationToMongooseQuery,
  createPaginatedResponse,
  type PaginationParams,
} from '@/lib/pagination';
import mongoose from 'mongoose';

/**
 * Handler for creating a new area
 */
async function createAreaHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('areas.create', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Await context.params for consistency with other handlers
      await context.params;

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
      let validatedData: CreateAreaInput;
      try {
        validatedData = createAreaSchema.parse(rawData);
      } catch (error) {
        if (error instanceof ZodError) {
          return NextResponse.json(
            {
              error: 'Validation Error',
              details: error.errors,
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.user.id': session?.user?.id || 'unknown',
        'request.area.name': validatedData.name,
        'request.location.id': validatedData.location,
      });

      // Connect to database
      await connectToDatabase();

      // Verify the location exists
      const locationExists = await createDatabaseSpan('findOne', 'locations', async () => {
        return await Location.exists({
          _id: new mongoose.Types.ObjectId(validatedData.location),
        });
      });

      if (!locationExists) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'The specified location does not exist',
          },
          { status: 404 }
        );
      }

      // Create area in database
      const area = await createDatabaseSpan('insert', 'areas', async () => {
        // Create new area
        const newArea = new Area(validatedData);
        return await newArea.save();
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.area.id': area._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: area,
        },
        { status: 201 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        'code' in error &&
        error.code === 11000
      ) {
        // Duplicate key error (e.g., area name already exists in this location)
        return NextResponse.json(
          {
            error: 'Duplicate Error',
            message: 'An area with this name already exists in the specified location',
          },
          { status: 409 }
        );
      }

      // Log and return generic error
      console.error('Error creating area:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}

/**
 * Handler for listing areas with pagination and filtering
 */
async function listAreasHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('areas.list', async () => {
    try {
      // Await context.params for consistency with other handlers
      await context.params;

      // Connect to database
      await connectToDatabase();

      // Get pagination parameters from request
      const paginationParams: PaginationParams = getPaginationParamsFromRequest(request);

      // Extract potential filter parameters
      const { searchParams } = new URL(request.url);
      const nameFilter = searchParams.get('name');
      const locationFilter = searchParams.get('locationId');
      const areaTypeFilter = searchParams.get('areaType');
      const searchQuery = searchParams.get('q'); // General search parameter

      // Build base query with optional filters
      const filterConditions: Record<string, unknown> = {};

      // OR conditions for the general search query
      const orConditions = [];

      // Individual field filters
      if (nameFilter) {
        filterConditions.name = { $regex: nameFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.name': nameFilter });
      }

      if (locationFilter) {
        filterConditions.location = locationFilter;
        addSpanAttributes({ 'request.filter.locationId': locationFilter });
      }

      if (areaTypeFilter) {
        filterConditions.areaType = areaTypeFilter;
        addSpanAttributes({ 'request.filter.areaType': areaTypeFilter });
      }

      // General search across all relevant text fields
      if (searchQuery) {
        // Search across multiple fields with the same query
        orConditions.push(
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { buildingSection: { $regex: searchQuery, $options: 'i' } }
        );

        addSpanAttributes({ 'request.search.query': searchQuery });
      }

      // If we have OR conditions, add them to the filter using $or
      if (orConditions.length > 0) {
        filterConditions.$or = orConditions;
      }

      // Add filter details to span
      addSpanAttributes({
        'request.page': paginationParams.page,
        'request.limit': paginationParams.limit,
        'request.hasFilters': Object.keys(filterConditions).length > 0,
      });

      // Create the base query for areas
      const baseQuery = Area.find(filterConditions).populate('location', 'name');

      // Apply pagination and sorting to query
      const paginatedQuery = applyPaginationToMongooseQuery(baseQuery, paginationParams);

      // Execute query to get paginated results
      const areas = await createDatabaseSpan('find', 'areas', async () => {
        return await paginatedQuery.exec();
      });

      // Count total items for pagination metadata
      const totalAreas = await createDatabaseSpan('count', 'areas', async () => {
        return await Area.countDocuments(filterConditions);
      });

      // Add result details to span
      addSpanAttributes({
        'result.count': areas.length,
        'result.totalCount': totalAreas,
      });

      // Create standardized paginated response
      const response = createPaginatedResponse(areas, paginationParams, totalAreas);

      // Return success response
      return NextResponse.json(response);
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error listing areas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/areas - Create a new area
 * Applies authentication middleware
 */
export const POST = applyMiddleware([authMiddleware], createAreaHandler);

/**
 * GET /api/areas - Get a paginated list of areas
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 * - name: Optional filter by area name (partial match)
 * - locationId: Optional filter by location ID (exact match)
 * - areaType: Optional filter by area type (exact match)
 * - q: General search across all text fields
 */
export const GET = applyMiddleware([authMiddleware], listAreasHandler);
