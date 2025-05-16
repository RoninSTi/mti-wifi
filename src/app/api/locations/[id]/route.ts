import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Location from '@/models/Location';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import {
  updateLocationSchema,
  locationParamsSchema,
  type UpdateLocationInput,
  type LocationParams,
} from '../schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware, RouteContext } from '../../middleware';
import { Types } from 'mongoose';

/**
 * Handler for updating a location by ID
 */
async function updateLocationHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('locations.update', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate URL parameter
      const params = await context.params;
      const id = params.id;
      let validatedParams: LocationParams;
      try {
        validatedParams = locationParamsSchema.parse({ id });
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
      let validatedData: UpdateLocationInput;
      try {
        validatedData = updateLocationSchema.parse(rawData);
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

      // Check if ID is valid MongoDB ObjectId
      if (!Types.ObjectId.isValid(validatedParams.id)) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'Location ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.user.id': session?.user?.id || 'unknown',
        'request.location.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Update location in database
      const updatedLocation = await createDatabaseSpan('updateOne', 'locations', async () => {
        const result = await Location.findByIdAndUpdate(
          validatedParams.id,
          { $set: validatedData },
          { new: true, runValidators: true }
        );

        if (!result) {
          throw new Error('Location not found');
        }

        return result;
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.location.id': updatedLocation._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: updatedLocation,
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Location not found') {
          return NextResponse.json(
            {
              error: 'Not Found',
              message: 'Location not found',
            },
            { status: 404 }
          );
        }

        if (error.name === 'MongoServerError' && 'code' in error && error.code === 11000) {
          // Duplicate key error (e.g., location name already exists in this organization)
          return NextResponse.json(
            {
              error: 'Duplicate Error',
              message: 'A location with this name already exists in the organization',
            },
            { status: 409 }
          );
        }
      }

      // Log and return generic error
      console.error('Error updating location:', error);
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
 * GET /api/locations/[id] - Get location by ID
 */
async function getLocationHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('locations.get', async () => {
    try {
      // Validate URL parameter
      const params = await context.params;
      const id = params.id;
      let validatedParams: LocationParams;
      try {
        validatedParams = locationParamsSchema.parse({ id });
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

      // Check if ID is valid MongoDB ObjectId
      if (!Types.ObjectId.isValid(validatedParams.id)) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'Location ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.location.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Fetch location from database
      const location = await createDatabaseSpan('findById', 'locations', async () => {
        const result = await Location.findById(validatedParams.id).populate('organization', 'name');

        if (!result) {
          throw new Error('Location not found');
        }

        return result;
      });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: location,
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error && error.message === 'Location not found') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Location not found',
          },
          { status: 404 }
        );
      }

      // Log and return generic error
      console.error('Error fetching location:', error);
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
 * Handler for deleting a location by ID
 */
async function deleteLocationHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('locations.delete', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate URL parameter
      const params = await context.params;
      const id = params.id;
      let validatedParams: LocationParams;
      try {
        validatedParams = locationParamsSchema.parse({ id });
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

      // Check if ID is valid MongoDB ObjectId
      if (!Types.ObjectId.isValid(validatedParams.id)) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'Location ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.user.id': session?.user?.id || 'unknown',
        'request.location.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Delete location from database
      const deletedLocation = await createDatabaseSpan('deleteOne', 'locations', async () => {
        const result = await Location.findByIdAndDelete(validatedParams.id);

        if (!result) {
          throw new Error('Location not found');
        }

        return result;
      });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: 'Location deleted successfully',
          data: {
            _id: deletedLocation._id,
            name: deletedLocation.name,
          },
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Location not found') {
          return NextResponse.json(
            {
              error: 'Not Found',
              message: 'Location not found',
            },
            { status: 404 }
          );
        }
      }

      // Log and return generic error
      console.error('Error deleting location:', error);
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
 * PUT /api/locations/[id] - Update a location by ID
 * Applies authentication middleware
 */
export const PUT = applyMiddleware([authMiddleware], updateLocationHandler);

/**
 * GET /api/locations/[id] - Get location by ID
 * Applies authentication middleware
 */
export const GET = applyMiddleware([authMiddleware], getLocationHandler);

/**
 * DELETE /api/locations/[id] - Delete location by ID
 * Applies authentication middleware
 */
export const DELETE = applyMiddleware([authMiddleware], deleteLocationHandler);
