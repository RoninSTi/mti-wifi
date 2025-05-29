import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Gateway from '@/models/Gateway';
import {
  gatewayParamsSchema,
  updateGatewaySchema,
  type UpdateGatewayInput,
  type GatewayParams,
} from '../schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware, RouteContext } from '../../middleware';
import mongoose from 'mongoose';

/**
 * Handler for getting a single gateway by ID
 */
async function getGatewayHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('gateways.get', async () => {
    try {
      // Get the params and await them
      const contextParams = await context.params;

      // Validate and extract the gateway ID from the URL params
      let params: GatewayParams;
      try {
        params = gatewayParamsSchema.parse(contextParams);
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
        'request.gateway.id': params.id,
      });

      // Connect to database
      await connectToDatabase();

      // Query for the gateway by ID with related information
      const gateway = await createDatabaseSpan('findOne', 'gateways', async () => {
        return await Gateway.findById(params.id)
          .populate('location', 'name')
          .populate({
            path: 'sensors',
            select: 'name serial status',
            options: { limit: 50 }, // To prevent too many being loaded
          });
      });

      // Check if gateway exists
      if (!gateway) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Gateway not found',
          },
          { status: 404 }
        );
      }

      // Return success response
      return NextResponse.json({
        success: true,
        data: gateway,
      });
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'The provided gateway ID is invalid',
          },
          { status: 400 }
        );
      }

      // Log and return generic error
      console.error('Error getting gateway:', error);
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
 * Handler for updating a gateway by ID
 */
async function updateGatewayHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('gateways.update', async () => {
    try {
      // Get the params and await them
      const contextParams = await context.params;

      // Validate and extract the gateway ID from the URL params
      let params: GatewayParams;
      try {
        params = gatewayParamsSchema.parse(contextParams);
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

      // Validate the update data with Zod schema
      let validatedData: UpdateGatewayInput;
      try {
        validatedData = updateGatewaySchema.parse(rawData);
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
        'request.gateway.id': params.id,
        'request.update.fields': Object.keys(validatedData).join(','),
      });

      // Connect to database
      await connectToDatabase();

      // Update the gateway with the validated data
      const updatedGateway = await createDatabaseSpan('findOneAndUpdate', 'gateways', async () => {
        return await Gateway.findByIdAndUpdate(params.id, validatedData, {
          new: true, // Return the updated document
          runValidators: true, // Run Mongoose validators
        }).populate('location', 'name');
      });

      // Check if gateway exists
      if (!updatedGateway) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Gateway not found',
          },
          { status: 404 }
        );
      }

      // Return success response
      return NextResponse.json({
        success: true,
        data: updatedGateway,
      });
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'The provided gateway ID is invalid',
          },
          { status: 400 }
        );
      }

      if (
        error instanceof Error &&
        error.name === 'MongoServerError' &&
        'code' in error &&
        error.code === 11000
      ) {
        // Duplicate key error
        return NextResponse.json(
          {
            error: 'Duplicate Error',
            message: 'A gateway with this serial number already exists',
          },
          { status: 409 }
        );
      }

      // Log and return generic error
      console.error('Error updating gateway:', error);
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
 * Handler for deleting a gateway by ID
 */
async function deleteGatewayHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('gateways.delete', async () => {
    try {
      // Get the params and await them
      const contextParams = await context.params;

      // Validate and extract the gateway ID from the URL params
      let params: GatewayParams;
      try {
        params = gatewayParamsSchema.parse(contextParams);
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
        'request.gateway.id': params.id,
      });

      // Connect to database
      await connectToDatabase();

      // Check if there are any sensors associated with this gateway
      const sensorCount = await createDatabaseSpan('count', 'sensors', async () => {
        return await mongoose.model('Sensor').countDocuments({ gateway: params.id });
      });

      if (sensorCount > 0) {
        return NextResponse.json(
          {
            error: 'Conflict',
            message: `Cannot delete gateway with ${sensorCount} associated sensor(s). Remove the sensors first.`,
          },
          { status: 409 }
        );
      }

      // Delete the gateway
      const deletedGateway = await createDatabaseSpan('findOneAndDelete', 'gateways', async () => {
        return await Gateway.findByIdAndDelete(params.id);
      });

      // Check if gateway existed before the delete operation
      if (!deletedGateway) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Gateway not found',
          },
          { status: 404 }
        );
      }

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Gateway deleted successfully',
      });
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'The provided gateway ID is invalid',
          },
          { status: 400 }
        );
      }

      // Log and return generic error
      console.error('Error deleting gateway:', error);
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
 * GET /api/gateways/[id] - Get a single gateway by ID
 * Applies authentication middleware
 */
export const GET = applyMiddleware([authMiddleware], getGatewayHandler);

/**
 * PATCH /api/gateways/[id] - Update a gateway by ID
 * Applies authentication middleware
 */
export const PATCH = applyMiddleware([authMiddleware], updateGatewayHandler);

/**
 * DELETE /api/gateways/[id] - Delete a gateway by ID
 * Applies authentication middleware
 */
export const DELETE = applyMiddleware([authMiddleware], deleteGatewayHandler);
