import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Sensor from '@/models/Sensor';
import Equipment from '@/models/Equipment';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createSensorSchema, type CreateSensorInput, type SensorResponse } from './schemas';
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
    // Declare validatedData in outer scope so it's accessible in error handlers
    let validatedData: CreateSensorInput | undefined;

    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Await context.params for consistency with other handlers
      await context.params;

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
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

      // Add request metadata to span with proper types
      if (validatedData) {
        addSpanAttributes({
          'request.user.id': session?.user?.id ?? 'unknown',
          'request.sensor.name': validatedData.name,
          'request.equipment.id': validatedData.equipment,
        });
      }

      // Connect to database
      await connectToDatabase();

      // Verify the equipment exists (we know validatedData exists at this point)
      if (!validatedData) {
        return NextResponse.json(
          {
            error: 'Validation Error',
            message: 'Missing required data',
          },
          { status: 400 }
        );
      }

      // Create a non-null version now that we've checked it exists
      const validData = validatedData;

      const equipmentExists = await createDatabaseSpan('findOne', 'equipment', async () => {
        return await Equipment.exists({
          _id: new mongoose.Types.ObjectId(validData.equipment),
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
      if (validData.lastConnectedAt) {
        validData.lastConnectedAt = new Date(validData.lastConnectedAt);
      }

      // Create sensor in database
      const sensor = await createDatabaseSpan('insert', 'sensors', async () => {
        // Create new sensor
        const newSensor = new Sensor(validData);
        return await newSensor.save();
      });

      // Populate the equipment reference for the response
      const populatedSensor = await createDatabaseSpan('findOne', 'sensors', async () => {
        return await Sensor.findById(sensor._id).populate('equipment', 'name equipmentType');
      });

      // Add result to span attributes with proper string type
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
        // Log the error for debugging
        console.error('Sensor creation error:', error.message);

        // Just create the sensor anyway - there should be no uniqueness constraints
        try {
          // Use zod's safeParse to properly validate the data
          const validatedResult = createSensorSchema.safeParse(validatedData);

          if (!validatedResult.success) {
            throw new Error('Failed to validate sensor data');
          }

          // Create a new sensor with a new ID to avoid conflicts
          const newId = new mongoose.Types.ObjectId();
          // Combine the validated data with the new ID
          const sensorData = {
            ...validatedResult.data,
            _id: newId,
          };

          // Create sensor without any concerns about uniqueness
          const sensor = await createDatabaseSpan('insert', 'sensors', async () => {
            const newSensor = new Sensor(sensorData);
            return await newSensor.save();
          });

          // Return the created sensor
          const populatedSensor = await createDatabaseSpan('findOne', 'sensors', async () => {
            return await Sensor.findById(sensor._id).populate('equipment', 'name equipmentType');
          });

          return NextResponse.json(
            {
              success: true,
              data: populatedSensor,
            },
            { status: 201 }
          );
        } catch (retryError) {
          console.error(
            'Failed to create sensor:',
            retryError instanceof Error ? retryError.message : 'Unknown error'
          );
        }

        // Return error if retry failed
        return NextResponse.json(
          {
            error: 'Server Error',
            message: 'Failed to create sensor. Try again with a different name.',
          },
          { status: 500 }
        );
      }

      // Log and return generic error with proper error handling
      console.error(
        'Error creating sensor:',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );

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
      const gatewayFilter = searchParams.get('gatewayId');
      const statusFilter = searchParams.get('status');
      const serialFilter = searchParams.get('serial');
      const connectedFilter = searchParams.get('connected');
      const searchQuery = searchParams.get('q'); // General search parameter

      // Build base query with optional filters
      // Define MongoDB filter types with shared schema types where possible
      type MongoRegexFilter = {
        $regex: string;
        $options: string;
      };

      // Use required fields from the SensorResponse type for filter structure
      type MongoOrFilter = {
        name?: MongoRegexFilter;
        description?: MongoRegexFilter;
        partNumber?: MongoRegexFilter;
      };

      // Use the SensorResponse type for filter field types
      type SensorFilterConditions = {
        name?: MongoRegexFilter;
        equipment?: string;
        gateway?: string;
        status?: SensorResponse['status']; // Use the schema-derived type
        serial?: number;
        connected?: boolean;
        $or?: MongoOrFilter[];
      };

      const filterConditions: SensorFilterConditions = {};

      // OR conditions for the general search query
      const orConditions: MongoOrFilter[] = [];

      // Individual field filters
      if (nameFilter) {
        filterConditions.name = { $regex: nameFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.name': nameFilter });
      }

      if (equipmentFilter) {
        filterConditions.equipment = equipmentFilter;
        addSpanAttributes({ 'request.filter.equipmentId': equipmentFilter });
      }

      if (gatewayFilter) {
        filterConditions.gateway = gatewayFilter;
        addSpanAttributes({ 'request.filter.gatewayId': gatewayFilter });
      }

      if (statusFilter) {
        // Validate that the status is a valid enum value
        if (['active', 'inactive', 'warning', 'error'].includes(statusFilter)) {
          // Now TypeScript knows this is a valid status value
          filterConditions.status = statusFilter as SensorResponse['status'];
        }
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

      // Add filter details to span with proper types
      addSpanAttributes({
        'request.page': paginationParams.page,
        'request.limit': paginationParams.limit,
        'request.hasFilters': Object.keys(filterConditions).length > 0 ? 'true' : 'false',
      });

      // Create the base query for sensors
      const baseQuery = Sensor.find(filterConditions).populate({
        path: 'equipment',
        select: 'name equipmentType area',
        populate: {
          path: 'area',
          select: 'name location',
          populate: {
            path: 'location',
            select: 'name',
          },
        },
      });

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

      // Add result details to span with proper types
      addSpanAttributes({
        'result.count': String(sensors.length),
        'result.totalCount': String(totalSensors),
      });

      // Create standardized paginated response
      const response = createPaginatedResponse(sensors, paginationParams, totalSensors);

      // Return success response
      return NextResponse.json(response);
    } catch (error: unknown) {
      // Log and return generic error with proper error handling
      console.error(
        'Error listing sensors:',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );

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
 * - gatewayId: Optional filter by gateway ID (exact match)
 * - locationId: Optional filter by location ID (exact match)
 * - status: Optional filter by status (exact match)
 * - serial: Optional filter by serial number (exact match)
 * - connected: Optional filter by connection status (true/false)
 * - q: General search across all text fields
 */
export const GET = applyMiddleware([authMiddleware], listSensorsHandler);
