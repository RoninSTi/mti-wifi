import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Sensor from '@/models/Sensor';
import _Equipment from '@/models/Equipment';
import _Gateway from '@/models/Gateway';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { sensorParamsSchema, updateSensorSchema, type UpdateSensorInput } from '../schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware, RouteContext } from '../../middleware';
import mongoose from 'mongoose';

/**
 * Handler for getting a single sensor by ID
 */
async function getSensorHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Get the ID parameter first
  const params = await context.params;
  const id = params.id;

  return await createApiSpan('sensor.get', async () => {
    try {
      // Validate with Zod schema
      try {
        sensorParamsSchema.parse({ id });
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
        'request.sensor.id': id,
      });

      // Connect to database
      await connectToDatabase();

      // Fetch the sensor from database
      const sensor = await createDatabaseSpan('findOne', 'sensors', async () => {
        return await Sensor.findById(new mongoose.Types.ObjectId(id))
          .populate('equipment', 'name equipmentType')
          .populate('gateway', '_id name ipAddress');
      });

      // Check if the sensor exists
      if (!sensor) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Sensor not found',
          },
          { status: 404 }
        );
      }

      // Return success response
      return NextResponse.json({
        data: sensor,
      });
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error getting sensor:', error);
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
 * Handler for updating a sensor by ID
 */
async function updateSensorHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Get the ID parameter first
  const params = await context.params;
  const id = params.id;

  return await createApiSpan('sensor.update', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate params with Zod schema
      try {
        sensorParamsSchema.parse({ id });
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

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
      let validatedData: UpdateSensorInput;
      try {
        validatedData = updateSensorSchema.parse(rawData);
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
        'request.sensor.id': id,
      });

      // Connect to database
      await connectToDatabase();

      // Check if the sensor exists before attempting to update
      const sensorExists = await createDatabaseSpan('findOne', 'sensors', async () => {
        return await Sensor.exists({
          _id: new mongoose.Types.ObjectId(id),
        });
      });

      if (!sensorExists) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Sensor not found',
          },
          { status: 404 }
        );
      }

      // Handle date fields properly if needed
      if ('lastConnectedAt' in validatedData && validatedData.lastConnectedAt) {
        validatedData.lastConnectedAt = new Date(validatedData.lastConnectedAt as string | Date);
      }

      // Update the sensor in database
      const updatedSensor = await createDatabaseSpan('findOneAndUpdate', 'sensors', async () => {
        return await Sensor.findByIdAndUpdate(
          new mongoose.Types.ObjectId(id),
          { $set: validatedData },
          { new: true, runValidators: true }
        )
          .populate('equipment', 'name equipmentType')
          .populate('gateway', '_id name ipAddress');
      });

      // Add result to span attributes
      addSpanAttributes({
        'result.sensor.id': id,
        'result.sensor.updated': Boolean(updatedSensor),
      });

      // Return success response
      return NextResponse.json({
        success: true,
        data: updatedSensor,
      });
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
      console.error('Error updating sensor:', error);
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
 * Handler for deleting a sensor by ID
 */
async function deleteSensorHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Get the ID parameter first
  const params = await context.params;
  const id = params.id;

  return await createApiSpan('sensor.delete', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate with Zod schema
      try {
        sensorParamsSchema.parse({ id });
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
        'request.sensor.id': id,
      });

      // Connect to database
      await connectToDatabase();

      // Delete the sensor from database
      const deletedSensor = await createDatabaseSpan('findOneAndDelete', 'sensors', async () => {
        return await Sensor.findByIdAndDelete(new mongoose.Types.ObjectId(id));
      });

      // Check if the sensor exists
      if (!deletedSensor) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Sensor not found',
          },
          { status: 404 }
        );
      }

      // Add result to span attributes
      addSpanAttributes({
        'result.sensor.id': id,
        'result.sensor.deleted': Boolean(deletedSensor),
      });

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Sensor deleted successfully',
      });
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error deleting sensor:', error);
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
 * GET /api/sensors/[id] - Get a single sensor by ID
 */
export const GET = applyMiddleware([authMiddleware], getSensorHandler);

/**
 * PATCH /api/sensors/[id] - Update a sensor by ID
 */
export const PATCH = applyMiddleware([authMiddleware], updateSensorHandler);

/**
 * DELETE /api/sensors/[id] - Delete a sensor by ID
 */
export const DELETE = applyMiddleware([authMiddleware], deleteSensorHandler);
