import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Equipment from '@/models/Equipment';
import Area from '@/models/Area';
import Location from '@/models/Location';
import Organization from '@/models/Organization';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createEquipmentSchema, type CreateEquipmentInput } from './schemas';
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
 * Handler for creating new equipment
 */
async function createEquipmentHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('equipment.create', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Await context.params for consistency with other handlers
      await context.params;

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
      let validatedData: CreateEquipmentInput;
      try {
        validatedData = createEquipmentSchema.parse(rawData);
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
        'request.equipment.name': validatedData.name,
        'request.area.id': validatedData.area,
      });

      // Connect to database
      await connectToDatabase();

      // Verify the area exists
      const areaExists = await createDatabaseSpan('findOne', 'areas', async () => {
        return await Area.exists({
          _id: new mongoose.Types.ObjectId(validatedData.area),
        });
      });

      if (!areaExists) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'The specified area does not exist',
          },
          { status: 404 }
        );
      }

      // Handle date fields properly
      if (validatedData.installationDate) {
        validatedData.installationDate = new Date(validatedData.installationDate);
      }

      if (validatedData.lastMaintenanceDate) {
        validatedData.lastMaintenanceDate = new Date(validatedData.lastMaintenanceDate);
      }

      // Create equipment in database
      const equipment = await createDatabaseSpan('insert', 'equipment', async () => {
        // Create new equipment
        const newEquipment = new Equipment(validatedData);
        return await newEquipment.save();
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.equipment.id': equipment._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: equipment,
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
        // Duplicate key error (e.g., equipment name already exists in this area)
        return NextResponse.json(
          {
            error: 'Duplicate Error',
            message: 'Equipment with this name already exists in the specified area',
          },
          { status: 409 }
        );
      }

      // Log and return generic error
      console.error('Error creating equipment:', error);
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
 * Handler for listing equipment with pagination and filtering
 */
async function listEquipmentHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('equipment.list', async () => {
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
      const areaFilter = searchParams.get('areaId');
      const equipmentTypeFilter = searchParams.get('equipmentType');
      const statusFilter = searchParams.get('status');
      // Commenting out unused filter that will be implemented in a future update
      // const maintenanceDueFilter = searchParams.get('maintenanceDue');
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

      if (areaFilter) {
        filterConditions.area = areaFilter;
        addSpanAttributes({ 'request.filter.areaId': areaFilter });
      }

      if (equipmentTypeFilter) {
        filterConditions.equipmentType = { $regex: equipmentTypeFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.equipmentType': equipmentTypeFilter });
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
          { equipmentType: { $regex: searchQuery, $options: 'i' } },
          { manufacturer: { $regex: searchQuery, $options: 'i' } },
          { modelNumber: { $regex: searchQuery, $options: 'i' } },
          { serialNumber: { $regex: searchQuery, $options: 'i' } },
          { notes: { $regex: searchQuery, $options: 'i' } }
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

      // Create the base query for equipment
      const baseQuery = Equipment.find(filterConditions).populate('area', 'name');

      // Apply pagination and sorting to query
      const paginatedQuery = applyPaginationToMongooseQuery(baseQuery, paginationParams);

      // Execute query to get paginated results
      const equipment = await createDatabaseSpan('find', 'equipment', async () => {
        return await paginatedQuery.exec();
      });

      // Count total items for pagination metadata
      const totalEquipment = await createDatabaseSpan('count', 'equipment', async () => {
        return await Equipment.countDocuments(filterConditions);
      });

      // Add result details to span
      addSpanAttributes({
        'result.count': equipment.length,
        'result.totalCount': totalEquipment,
      });

      // Create standardized paginated response
      const response = createPaginatedResponse(equipment, paginationParams, totalEquipment);

      // Return success response
      return NextResponse.json(response);
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error listing equipment:', error);
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
 * POST /api/equipment - Create new equipment
 * Applies authentication middleware
 */
export const POST = applyMiddleware([authMiddleware], createEquipmentHandler);

/**
 * GET /api/equipment - Get a paginated list of equipment
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 * - name: Optional filter by equipment name (partial match)
 * - areaId: Optional filter by area ID (exact match)
 * - equipmentType: Optional filter by equipment type (partial match)
 * - status: Optional filter by status (exact match)
 * - q: General search across all text fields
 */
export const GET = applyMiddleware([authMiddleware], listEquipmentHandler);
