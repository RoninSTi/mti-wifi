import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Organization from '@/models/Organization';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createOrganizationSchema, type CreateOrganizationInput } from './schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware } from '../middleware';

/**
 * Handler for creating a new organization
 */
async function createOrganizationHandler(request: NextRequest): Promise<NextResponse> {
  return await createApiSpan('organizations.create', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Parse request body
      const rawData = await request.json();

      // Validate with Zod schema
      let validatedData: CreateOrganizationInput;
      try {
        validatedData = createOrganizationSchema.parse(rawData);
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
        'request.organization.name': validatedData.name,
      });

      // Connect to database
      await connectToDatabase();

      // Create organization in database
      const organization = await createDatabaseSpan('insert', 'organizations', async () => {
        // Create new organization
        const newOrg = new Organization(validatedData);
        return await newOrg.save();
      });

      // Add result to span attributes
      addSpanAttributes({ 'result.organization.id': organization._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: organization,
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
        // Duplicate key error (e.g., organization name already exists)
        return NextResponse.json(
          {
            error: 'Duplicate Error',
            message: 'An organization with this name already exists',
          },
          { status: 409 }
        );
      }

      // Log and return generic error
      console.error('Error creating organization:', error);
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
 * POST /api/organizations - Create a new organization
 * Applies authentication middleware
 */
export const POST = applyMiddleware([authMiddleware], createOrganizationHandler);
