import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
// Import models in order of dependencies to ensure proper registration
import Organization from '@/models/Organization';
import Location from '@/models/Location';
import Area from '@/models/Area';
import Equipment from '@/models/Equipment';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import {
  equipmentParamsSchema,
  updateEquipmentSchema,
  type UpdateEquipmentInput,
} from '../schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware, RouteContext } from '../../middleware';
import mongoose from 'mongoose';

/**
 * Handler to get a single equipment item by ID
 */
async function getEquipmentHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const params = await context.params;
  const id = params.id;
  return await createApiSpan('equipment.get', async () => {
    try {
      // Validate the ID parameter
      try {
        equipmentParamsSchema.parse({ id });
      } catch (error) {
        if (error instanceof ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid Parameter',
              details: error.errors,
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.equipment.id': id,
      });

      // Connect to database
      await connectToDatabase();

      // Get equipment from database with referenced area and nested organization
      const equipment = await createDatabaseSpan('findOne', 'equipment', async () => {
        return await Equipment.findById(id).populate({
          path: 'area',
          select: 'name location',
          populate: {
            path: 'location',
            select: 'name organization address',
            populate: {
              path: 'organization',
              select: 'name',
            },
          },
        });
      });

      // Check if equipment exists
      if (!equipment) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Equipment not found',
          },
          { status: 404 }
        );
      }

      // Return success response
      return NextResponse.json({
        data: equipment,
      });
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'The provided equipment ID is invalid',
          },
          { status: 400 }
        );
      }

      // Log and return generic error
      console.error('Error getting equipment:', error);
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
 * Handler to update a equipment by ID
 */
async function updateEquipmentHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const params = await context.params;
  const id = params.id;
  return await createApiSpan('equipment.update', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate the ID parameter
      try {
        equipmentParamsSchema.parse({ id });
      } catch (error) {
        if (error instanceof ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid Parameter',
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
      let validatedData: UpdateEquipmentInput;
      try {
        validatedData = updateEquipmentSchema.parse(rawData);
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
        'request.equipment.id': id,
        'request.update.fields': Object.keys(validatedData).join(','),
      });

      // Connect to database
      await connectToDatabase();

      // Handle date fields properly
      if (validatedData.installationDate) {
        validatedData.installationDate = new Date(validatedData.installationDate);
      }

      if (validatedData.lastMaintenanceDate) {
        validatedData.lastMaintenanceDate = new Date(validatedData.lastMaintenanceDate);
      }

      // Update equipment in database and return the updated document
      const updatedEquipment = await createDatabaseSpan('findAndUpdate', 'equipment', async () => {
        return await Equipment.findByIdAndUpdate(
          id,
          { $set: validatedData },
          { new: true, runValidators: true }
        ).populate({
          path: 'area',
          select: 'name location',
          populate: {
            path: 'location',
            select: 'name organization address',
            populate: {
              path: 'organization',
              select: 'name',
            },
          },
        });
      });

      // Check if equipment exists
      if (!updatedEquipment) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Equipment not found',
          },
          { status: 404 }
        );
      }

      // Return success response
      return NextResponse.json({
        success: true,
        data: updatedEquipment,
      });
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'The provided equipment ID is invalid',
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
      console.error('Error updating equipment:', error);
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
 * Handler to delete equipment by ID
 */
async function deleteEquipmentHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const params = await context.params;
  const id = params.id;
  return await createApiSpan('equipment.delete', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate the ID parameter
      try {
        equipmentParamsSchema.parse({ id });
      } catch (error) {
        if (error instanceof ZodError) {
          return NextResponse.json(
            {
              error: 'Invalid Parameter',
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
        'request.equipment.id': id,
      });

      // Connect to database
      await connectToDatabase();

      // Delete equipment from database
      const result = await createDatabaseSpan('findAndDelete', 'equipment', async () => {
        return await Equipment.findByIdAndDelete(id);
      });

      // Check if equipment exists and was deleted
      if (!result) {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Equipment not found',
          },
          { status: 404 }
        );
      }

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Equipment deleted successfully',
      });
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json(
          {
            error: 'Invalid ID',
            message: 'The provided equipment ID is invalid',
          },
          { status: 400 }
        );
      }

      // Log and return generic error
      console.error('Error deleting equipment:', error);
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
 * GET /api/equipment/[id] - Get a single equipment by ID
 */
export const GET = applyMiddleware([authMiddleware], getEquipmentHandler);

/**
 * PUT /api/equipment/[id] - Update an equipment by ID
 */
export const PUT = applyMiddleware([authMiddleware], updateEquipmentHandler);

/**
 * DELETE /api/equipment/[id] - Delete an equipment by ID
 */
export const DELETE = applyMiddleware([authMiddleware], deleteEquipmentHandler);
