import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Gateway from '@/models/Gateway';
import Location from '@/models/Location';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createGatewaySchema, type CreateGatewayInput } from './schemas';
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
 * Handler for creating a new gateway
 */
async function createGatewayHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('gateways.create', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Await context.params for consistency with other handlers
      await context.params;

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
      let validatedData: CreateGatewayInput;
      try {
        validatedData = createGatewaySchema.parse(rawData);
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
        'request.gateway.name': validatedData.name,
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

      // Create gateway in database
      const gateway = await createDatabaseSpan('insert', 'gateways', async () => {
        // Create new gateway
        const newGateway = new Gateway(validatedData);
        return await newGateway.save();
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.gateway.id': gateway._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: gateway,
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
        // Duplicate key error (e.g., serial number already exists in this location)
        return NextResponse.json(
          {
            error: 'Duplicate Error',
            message: 'A gateway with this serial number already exists in the specified location',
          },
          { status: 409 }
        );
      }

      // Log and return generic error
      console.error('Error creating gateway:', error);
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
 * Handler for listing gateways with pagination and filtering
 */
async function listGatewaysHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('gateways.list', async () => {
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
      const serialNumberFilter = searchParams.get('serialNumber');
      const statusFilter = searchParams.get('status');
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

      if (serialNumberFilter) {
        filterConditions.serialNumber = { $regex: serialNumberFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.serialNumber': serialNumberFilter });
      }

      if (statusFilter) {
        filterConditions.status = statusFilter;
        addSpanAttributes({ 'request.filter.status': statusFilter });
      }

      // General search across all relevant text fields
      if (searchQuery) {
        // Search across multiple fields with the same query
        orConditions.push(
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { serialNumber: { $regex: searchQuery, $options: 'i' } },
          { url: { $regex: searchQuery, $options: 'i' } }
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

      // Create the base query for gateways
      const baseQuery = Gateway.find(filterConditions).populate('location', 'name');

      // Apply pagination and sorting to query
      const paginatedQuery = applyPaginationToMongooseQuery(baseQuery, paginationParams);

      // Execute query to get paginated results
      const gateways = await createDatabaseSpan('find', 'gateways', async () => {
        return await paginatedQuery.exec();
      });

      // Count total items for pagination metadata
      const totalGateways = await createDatabaseSpan('count', 'gateways', async () => {
        return await Gateway.countDocuments(filterConditions);
      });

      // Add result details to span
      addSpanAttributes({
        'result.count': gateways.length,
        'result.totalCount': totalGateways,
      });

      // Create standardized paginated response
      const response = createPaginatedResponse(gateways, paginationParams, totalGateways);

      // Return success response
      return NextResponse.json(response);
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error listing gateways:', error);
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
 * POST /api/gateways - Create a new gateway
 * Applies authentication middleware
 */
export const POST = applyMiddleware([authMiddleware], createGatewayHandler);

/**
 * GET /api/gateways - Get a paginated list of gateways
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 * - name: Optional filter by gateway name (partial match)
 * - locationId: Optional filter by location ID (exact match)
 * - serialNumber: Optional filter by serial number (partial match)
 * - status: Optional filter by status (exact match)
 * - q: General search across all text fields
 */
export const GET = applyMiddleware([authMiddleware], listGatewaysHandler);
