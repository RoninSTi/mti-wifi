import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Organization from '@/models/Organization';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import {
  updateOrganizationSchema,
  organizationParamsSchema,
  type UpdateOrganizationInput,
  type OrganizationParams,
} from '../schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware } from '../../middleware';
import { Types } from 'mongoose';

/**
 * Helper to get an organization ID from the request URL
 */
function getOrganizationIdFromRequest(request: NextRequest): string {
  return request.nextUrl.pathname.split('/').pop() || '';
}

/**
 * Handler for updating an organization by ID
 */
async function updateOrganizationHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return await createApiSpan('organizations.update', async () => {
    try {
      // Get session (we know it exists because of authMiddleware)
      const session = await getServerSession(authOptions);

      // Validate URL parameter
      let validatedParams: OrganizationParams;
      try {
        validatedParams = organizationParamsSchema.parse({ id: params.id });
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
      let validatedData: UpdateOrganizationInput;
      try {
        validatedData = updateOrganizationSchema.parse(rawData);
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
            message: 'Organization ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.user.id': session?.user?.id || 'unknown',
        'request.organization.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Update organization in database
      const updatedOrganization = await createDatabaseSpan(
        'updateOne',
        'organizations',
        async () => {
          const result = await Organization.findByIdAndUpdate(
            validatedParams.id,
            { $set: validatedData },
            { new: true, runValidators: true }
          );

          if (!result) {
            throw new Error('Organization not found');
          }

          return result;
        }
      );

      // Add result to span attributes
      addSpanAttributes({ 'result.organization.id': updatedOrganization._id.toString() });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: updatedOrganization,
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Organization not found') {
          return NextResponse.json(
            {
              error: 'Not Found',
              message: 'Organization not found',
            },
            { status: 404 }
          );
        }

        if (error.name === 'MongoServerError' && 'code' in error && error.code === 11000) {
          // Duplicate key error (e.g., organization name already exists)
          return NextResponse.json(
            {
              error: 'Duplicate Error',
              message: 'An organization with this name already exists',
            },
            { status: 409 }
          );
        }
      }

      // Log and return generic error
      console.error('Error updating organization:', error);
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
 * GET /api/organizations/[id] - Get organization by ID
 */
async function getOrganizationHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return await createApiSpan('organizations.get', async () => {
    try {
      // Validate URL parameter
      let validatedParams: OrganizationParams;
      try {
        validatedParams = organizationParamsSchema.parse({ id: params.id });
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
            message: 'Organization ID is not valid',
          },
          { status: 400 }
        );
      }

      // Add request metadata to span
      addSpanAttributes({
        'request.organization.id': validatedParams.id,
      });

      // Connect to database
      await connectToDatabase();

      // Fetch organization from database
      const organization = await createDatabaseSpan('findById', 'organizations', async () => {
        const result = await Organization.findById(validatedParams.id);

        if (!result) {
          throw new Error('Organization not found');
        }

        return result;
      });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: organization,
        },
        { status: 200 }
      );
    } catch (error: unknown) {
      // Handle specific errors
      if (error instanceof Error && error.message === 'Organization not found') {
        return NextResponse.json(
          {
            error: 'Not Found',
            message: 'Organization not found',
          },
          { status: 404 }
        );
      }

      // Log and return generic error
      console.error('Error fetching organization:', error);
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
 * PUT /api/organizations/[id] - Update an organization by ID
 * Applies authentication middleware
 */
export const PUT = applyMiddleware([authMiddleware], (request: NextRequest) =>
  updateOrganizationHandler(request, { params: { id: getOrganizationIdFromRequest(request) } })
);

/**
 * GET /api/organizations/[id] - Get organization by ID
 * Applies authentication middleware
 */
export const GET = applyMiddleware([authMiddleware], (request: NextRequest) =>
  getOrganizationHandler(request, { params: { id: getOrganizationIdFromRequest(request) } })
);
