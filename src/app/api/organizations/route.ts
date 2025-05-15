import { NextRequest, NextResponse } from 'next/server';
import { createApiSpan, createDatabaseSpan, addSpanAttributes } from '@/telemetry/utils';
import { connectToDatabase } from '@/lib/db/mongoose';
import Organization from '@/models/Organization';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { createOrganizationSchema, type CreateOrganizationInput } from './schemas';
import { ZodError } from 'zod';
import { applyMiddleware, authMiddleware } from '../middleware';
import {
  getPaginationParamsFromRequest,
  applyPaginationToMongooseQuery,
  createPaginatedResponse,
  type PaginationParams,
} from '@/lib/pagination';

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
 * Handler for listing organizations with pagination
 */
async function listOrganizationsHandler(request: NextRequest): Promise<NextResponse> {
  return await createApiSpan('organizations.list', async () => {
    try {
      // Connect to database
      await connectToDatabase();

      // Get pagination parameters from request
      const paginationParams: PaginationParams = getPaginationParamsFromRequest(request);

      // Extract potential filter parameters
      const { searchParams } = new URL(request.url);
      const nameFilter = searchParams.get('name');
      const contactNameFilter = searchParams.get('contactName');
      const contactEmailFilter = searchParams.get('contactEmail');
      const searchQuery = searchParams.get('q'); // General search parameter

      // Build base query with optional filters
      const filterConditions: Record<string, unknown> = {};

      // OR conditions for the general search query
      const orConditions = [];

      // Individual field filters (exact matches)
      if (nameFilter) {
        // Case-insensitive partial name match
        filterConditions.name = { $regex: nameFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.name': nameFilter });
      }

      if (contactNameFilter) {
        // Case-insensitive partial contact name match
        filterConditions.contactName = { $regex: contactNameFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.contactName': contactNameFilter });
      }

      if (contactEmailFilter) {
        // Case-insensitive exact or partial email match
        filterConditions.contactEmail = { $regex: contactEmailFilter, $options: 'i' };
        addSpanAttributes({ 'request.filter.contactEmail': contactEmailFilter });
      }

      // General search across all relevant text fields
      if (searchQuery) {
        // Search across multiple fields with the same query
        orConditions.push(
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { contactName: { $regex: searchQuery, $options: 'i' } },
          { contactEmail: { $regex: searchQuery, $options: 'i' } },
          { contactPhone: { $regex: searchQuery, $options: 'i' } },
          { address: { $regex: searchQuery, $options: 'i' } }
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

      // Create the base query for organizations
      const baseQuery = Organization.find(filterConditions);

      // Apply pagination and sorting to query
      const paginatedQuery = applyPaginationToMongooseQuery(baseQuery, paginationParams);

      // Execute query to get paginated results
      const organizations = await createDatabaseSpan('find', 'organizations', async () => {
        return await paginatedQuery.exec();
      });

      // Count total items for pagination metadata
      const totalOrganizations = await createDatabaseSpan('count', 'organizations', async () => {
        return await Organization.countDocuments(filterConditions);
      });

      // Add result details to span
      addSpanAttributes({
        'result.count': organizations.length,
        'result.totalCount': totalOrganizations,
      });

      // Create standardized paginated response
      const response = createPaginatedResponse(organizations, paginationParams, totalOrganizations);

      // Return success response
      return NextResponse.json(response);
    } catch (error: unknown) {
      // Log and return generic error
      console.error('Error listing organizations:', error);
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

/**
 * GET /api/organizations - Get a paginated list of organizations
 * Supports pagination with query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 * - name: Optional filter by organization name (partial match)
 */
export const GET = applyMiddleware([authMiddleware], listOrganizationsHandler);
