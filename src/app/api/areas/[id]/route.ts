import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Area from '@/models/Area';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import {
  updateAreaSchema,
  areaParamsSchema,
  type UpdateAreaInput,
  type AreaParams,
} from '../schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware, RouteContext } from '../../middleware';
import { Types } from 'mongoose';

/**
 * Handler for updating an area by ID
 */
async function updateAreaHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('areas.update', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate URL parameter
      let validatedParams: AreaParams;
      try {
        validatedParams = areaParamsSchema.parse({ id: context.params.id });
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
      let validatedData: UpdateAreaInput;
      try {
        validatedData = updateAreaSchema.parse(rawData);
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
            message: 'Area ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.user.id': session?.user?.id || 'unknown',
        'request.area.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Update area in database
      const updatedArea = await createDatabaseSpan('updateOne', 'areas', async () => {
        const result = await Area.findByIdAndUpdate(
          validatedParams.id,
          { $set: validatedData },
          { new: true, runValidators: true }
        ).populate('location', 'name');

        if (!result) {
          throw new Error('Area not found');
        }

        return result;
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.area.id': updatedArea._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: updatedArea,
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Area not found') {
          return NextResponse.json(
            {
              error: 'Not Found',
              message: 'Area not found',
            },
            { status: 404 }
          );
        }

        if (error.name === 'MongoServerError' && 'code' in error && error.code === 11000) {
          // Duplicate key error (e.g., area name already exists in this location)
          return NextResponse.json(
            {
              error: 'Duplicate Error',
              message: 'An area with this name already exists in the location',
            },
            { status: 409 }
          );
        }
      }

      // Log and return generic error
      console.error('Error updating area:', error);
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
 * GET /api/areas/[id] - Get area by ID
 */
async function getAreaHandler(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return await createApiSpan('areas.get', async () => {
    try {
      // Validate URL parameter
      let validatedParams: AreaParams;
      try {
        validatedParams = areaParamsSchema.parse({ id: context.params.id });
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
            message: 'Area ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.area.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Fetch area from database with populated location and organization
      const area = await createDatabaseSpan('findById', 'areas', async () => {
        const result = await Area.findById(validatedParams.id).populate({
          path: 'location',
          select: 'name organization address',
          populate: {
            path: 'organization',
            select: 'name',
          },
        });

        if (!result) {
          throw new Error('Area not found');
        }

        return result;
      });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: area,
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error && error.message === 'Area not found') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Area not found',
          },
          { status: 404 }
        );
      }

      // Log and return generic error
      console.error('Error fetching area:', error);
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
 * Handler for deleting an area by ID
 */
async function deleteAreaHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  return await createApiSpan('areas.delete', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate URL parameter
      let validatedParams: AreaParams;
      try {
        validatedParams = areaParamsSchema.parse({ id: context.params.id });
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
            message: 'Area ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.user.id': session?.user?.id || 'unknown',
        'request.area.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Delete area from database
      const deletedArea = await createDatabaseSpan('deleteOne', 'areas', async () => {
        const result = await Area.findByIdAndDelete(validatedParams.id);

        if (!result) {
          throw new Error('Area not found');
        }

        return result;
      });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: 'Area deleted successfully',
          data: {
            _id: deletedArea._id,
            name: deletedArea.name,
          },
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Area not found') {
          return NextResponse.json(
            {
              error: 'Not Found',
              message: 'Area not found',
            },
            { status: 404 }
          );
        }
      }

      // Log and return generic error
      console.error('Error deleting area:', error);
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
 * PUT /api/areas/[id] - Update an area by ID
 * Applies authentication middleware
 */
export const PUT = applyMiddleware([authMiddleware], updateAreaHandler);

/**
 * GET /api/areas/[id] - Get area by ID
 * Applies authentication middleware
 */
export const GET = applyMiddleware([authMiddleware], getAreaHandler);

/**
 * DELETE /api/areas/[id] - Delete area by ID
 * Applies authentication middleware
 */
export const DELETE = applyMiddleware([authMiddleware], deleteAreaHandler);
