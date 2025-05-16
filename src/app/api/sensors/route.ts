import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Sensor from '@/models/Sensor';
import Equipment from '@/models/Equipment';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createSensorSchema, type CreateSensorInput } from './schemas';
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
 * Handler for creating a new sensor
 */
async function createSensorHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('sensor.create', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Await context.params for consistency with other handlers
      await context.params;

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
      let validatedData: CreateSensorInput;
      try {
        validatedData = createSensorSchema.parse(rawData);
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
        'request.sensor.name': validatedData.name,
        'request.equipment.id': validatedData.equipment,
      });

      // Connect to database
      await connectToDatabase();

      // Verify the equipment exists
      const equipmentExists = await createDatabaseSpan('findOne', 'equipment', async () => {
        return await Equipment.exists({
          _id: new mongoose.Types.ObjectId(validatedData.equipment),
        });
      });

      if (!equipmentExists) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'The specified equipment does not exist',
          },
          { status: 404 }
        );
      }

      // Handle date fields properly
      if (validatedData.lastConnectedAt) {
        validatedData.lastConnectedAt = new Date(validatedData.lastConnectedAt);
      }

      // Create sensor in database
      const sensor = await createDatabaseSpan('insert', 'sensors', async () => {
        // Create new sensor
        const newSensor = new Sensor(validatedData);
        return await newSensor.save();
      });

      // Populate the equipment reference for the response
      const populatedSensor = await createDatabaseSpan('findOne', 'sensors', async () => {
        return await Sensor.findById(sensor._id).populate('equipment', 'name equipmentType');
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.sensor.id': sensor._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: populatedSensor,
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
        // Duplicate key error (e.g., sensor with that serial number already exists)
        return NextResponse.json(
          {
            error: 'Duplicate Error',
            message:
              'Sensor with this name already exists for the specified equipment or serial number is already in use',
          },
          { status: 409 }
        );
      }

      // Log and return generic error
      console.error('Error creating sensor:', error);
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
 * Handler for listing sensors with pagination and filtering
 */
async function listSensorsHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('sensors.list', async () => {
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
      const equipmentFilter = searchParams.get('equipmentId');
      const statusFilter = searchParams.get('status');
      const serialFilter = searchParams.get('serial');
      const connectedFilter = searchParams.get('connected');
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

      if (equipmentFilter) {
        filterConditions.equipment = equipmentFilter;
        addSpanAttributes({ 'request.filter.equipmentId': equipmentFilter });
      }

      if (statusFilter) {
        filterConditions.status = statusFilter;
        addSpanAttributes({ 'request.filter.status': statusFilter });
      }

      if (serialFilter) {
        filterConditions.serial = parseInt(serialFilter, 10);
        addSpanAttributes({ 'request.filter.serial': serialFilter });
      }

      if (connectedFilter) {
        filterConditions.connected = connectedFilter === 'true';
        addSpanAttributes({ 'request.filter.connected': connectedFilter });
      }

      // General search across all relevant text fields
      if (searchQuery) {
        // Search across multiple fields with the same query
        orConditions.push(
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { partNumber: { $regex: searchQuery, $options: 'i' } }
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

      // Create the base query for sensors
      const baseQuery = Sensor.find(filterConditions).populate('equipment', 'name equipmentType');

      // Apply pagination and sorting to query
      const paginatedQuery = applyPaginationToMongooseQuery(baseQuery, paginationParams);

      // Execute query to get paginated results
      const sensors = await createDatabaseSpan('find', 'sensors', async () => {
        return await paginatedQuery.exec();
      });

      // Count total items for pagination metadata
      const totalSensors = await createDatabaseSpan('count', 'sensors', async () => {
        return await Sensor.countDocuments(filterConditions);
      });

      // Add result details to span
      addSpanAttributes({
        'result.count': sensors.length,
        'result.totalCount': totalSensors,
      });

      // Create standardized paginated response
      const response = createPaginatedResponse(sensors, paginationParams, totalSensors);

      // Return success response
      return NextResponse.json(response);
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error listing sensors:', error);
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
 * POST /api/sensors - Create a new sensor
 * Applies authentication middleware
 */
export const POST = applyMiddleware([authMiddleware], createSensorHandler);

/**
 * GET /api/sensors - Get a paginated list of sensors
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 * - name: Optional filter by sensor name (partial match)
 * - equipmentId: Optional filter by equipment ID (exact match)
 * - status: Optional filter by status (exact match)
 * - serial: Optional filter by serial number (exact match)
 * - connected: Optional filter by connection status (true/false)
 * - q: General search across all text fields
 */
export const GET = applyMiddleware([authMiddleware], listSensorsHandler);
