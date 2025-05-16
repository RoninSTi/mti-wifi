import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Location from '@/models/Location';
import Organization from '@/models/Organization';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createLocationSchema, type CreateLocationInput } from './schemas';
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
 * Handler for creating a new location
 */
async function createLocationHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('locations.create', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Await context.params for consistency with other handlers
      await context.params;

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
      let validatedData: CreateLocationInput;
      try {
        validatedData = createLocationSchema.parse(rawData);
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
        'request.location.name': validatedData.name,
        'request.organization.id': validatedData.organization,
      });

      // Connect to database
      await connectToDatabase();

      // Verify the organization exists
      const organizationExists = await createDatabaseSpan('findOne', 'organizations', async () => {
        return await Organization.exists({
          _id: new mongoose.Types.ObjectId(validatedData.organization),
        });
      });

      if (!organizationExists) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'The specified organization does not exist',
          },
          { status: 404 }
        );
      }

      // Create location in database
      const location = await createDatabaseSpan('insert', 'locations', async () => {
        // Create new location
        const newLocation = new Location(validatedData);
        return await newLocation.save();
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.location.id': location._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: location,
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
        // Duplicate key error (e.g., location name already exists in this organization)
        return NextResponse.json(
          {
            error: 'Duplicate Error',
            message: 'A location with this name already exists in the specified organization',
          },
          { status: 409 }
        );
      }

      // Log and return generic error
      console.error('Error creating location:', error);
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
 * Handler for listing locations with pagination and filtering
 */
async function listLocationsHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('locations.list', async () => {
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
      const organizationFilter = searchParams.get('organizationId');
      const cityFilter = searchParams.get('city');
      const stateFilter = searchParams.get('state');
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

      if (organizationFilter) {
        filterConditions.organization = organizationFilter;
        addSpanAttributes({ 'request.filter.organizationId': organizationFilter });
      }

      if (cityFilter) {
        filterConditions.city = { $regex: cityFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.city': cityFilter });
      }

      if (stateFilter) {
        filterConditions.state = { $regex: stateFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.state': stateFilter });
      }

      // General search across all relevant text fields
      if (searchQuery) {
        // Search across multiple fields with the same query
        orConditions.push(
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { address: { $regex: searchQuery, $options: 'i' } },
          { city: { $regex: searchQuery, $options: 'i' } },
          { state: { $regex: searchQuery, $options: 'i' } },
          { zipCode: { $regex: searchQuery, $options: 'i' } },
          { country: { $regex: searchQuery, $options: 'i' } }
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

      // Create the base query for locations
      const baseQuery = Location.find(filterConditions).populate('organization', 'name');

      // Apply pagination and sorting to query
      const paginatedQuery = applyPaginationToMongooseQuery(baseQuery, paginationParams);

      // Execute query to get paginated results
      const locations = await createDatabaseSpan('find', 'locations', async () => {
        return await paginatedQuery.exec();
      });

      // Count total items for pagination metadata
      const totalLocations = await createDatabaseSpan('count', 'locations', async () => {
        return await Location.countDocuments(filterConditions);
      });

      // Add result details to span
      addSpanAttributes({
        'result.count': locations.length,
        'result.totalCount': totalLocations,
      });

      // Create standardized paginated response
      const response = createPaginatedResponse(locations, paginationParams, totalLocations);

      // Return success response
      return NextResponse.json(response);
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error listing locations:', error);
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
 * POST /api/locations - Create a new location
 * Applies authentication middleware
 */
export const POST = applyMiddleware([authMiddleware], createLocationHandler);

/**
 * GET /api/locations - Get a paginated list of locations
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 * - name: Optional filter by location name (partial match)
 * - organizationId: Optional filter by organization ID (exact match)
 * - city: Optional filter by city (partial match)
 * - state: Optional filter by state (partial match)
 * - q: General search across all text fields
 */
export const GET = applyMiddleware([authMiddleware], listLocationsHandler);
