import { NextRequest } from 'next/server';
import {
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  DEFAULT_PAGINATION_CONFIG,
} from './types';
import { Query } from 'mongoose';

/**
 * Extracts pagination parameters from a Next.js request
 * @param request The incoming NextRequest object
 * @returns Standardized pagination parameters
 */
export function getPaginationParamsFromRequest(request: NextRequest): PaginationParams {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Extract and validate pagination parameters
  const page = Math.max(
    1,
    parseInt(searchParams.get('page') || String(DEFAULT_PAGINATION_CONFIG.DEFAULT_PAGE))
  );

  const limit = Math.min(
    DEFAULT_PAGINATION_CONFIG.MAX_LIMIT,
    Math.max(
      1,
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGINATION_CONFIG.DEFAULT_LIMIT))
    )
  );

  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder =
    (searchParams.get('sortOrder') as 'asc' | 'desc') ||
    DEFAULT_PAGINATION_CONFIG.DEFAULT_SORT_ORDER;

  return {
    page,
    limit,
    sortBy,
    sortOrder,
  };
}

/**
 * Creates pagination metadata based on query results
 * @param params Pagination parameters used in the query
 * @param totalItems Total count of items matching the query without pagination
 * @returns Pagination metadata
 */
export function createPaginationMeta(params: PaginationParams, totalItems: number): PaginationMeta {
  const totalPages = Math.ceil(totalItems / params.limit) || 1;

  return {
    currentPage: params.page,
    totalPages,
    totalItems,
    itemsPerPage: params.limit,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
  };
}

/**
 * Creates a standardized paginated response
 * @param data The array of items for the current page
 * @param params Pagination parameters used in the query
 * @param totalItems Total count of items matching the query without pagination
 * @returns A standardized paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  params: PaginationParams,
  totalItems: number
): PaginatedResponse<T> {
  return {
    data,
    meta: createPaginationMeta(params, totalItems),
  };
}

/**
 * Applies pagination to a MongoDB/Mongoose query
 * @param query The Mongoose query object
 * @param params Pagination parameters
 * @returns The modified query with pagination applied
 */
export function applyPaginationToMongooseQuery<T, DocType = T>(
  query: Query<T[], DocType>,
  params: PaginationParams
): Query<T[], DocType> {
  const skip = (params.page - 1) * params.limit;

  query = query.skip(skip).limit(params.limit);

  // Apply sorting if sortBy is specified
  if (params.sortBy) {
    const sortDirection = params.sortOrder === 'desc' ? -1 : 1;
    query = query.sort({ [params.sortBy]: sortDirection });
  }

  return query;
}

/**
 * Helper to paginate an in-memory array (useful for testing or small datasets)
 * @param array The array to paginate
 * @param params Pagination parameters
 * @returns A paginated response with the appropriate slice of data
 */
export function paginateArray<T extends Record<string, unknown>>(
  array: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const start = (params.page - 1) * params.limit;
  const end = start + params.limit;

  // Sort the array if needed
  const sortedArray = [...array];
  if (params.sortBy) {
    const sortKey = params.sortBy as keyof T;
    sortedArray.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Handle comparison based on types
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Compare values based on their types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return params.sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Safe comparisons for non-null values
      try {
        // For numbers, booleans, and dates
        if (aValue < bValue) return params.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return params.sortOrder === 'asc' ? 1 : -1;
      } catch {
        // If comparison fails, try string conversion as fallback
        const aStr = String(aValue);
        const bStr = String(bValue);
        return params.sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      }

      return 0;
    });
  }

  // Slice the array according to pagination params
  const paginatedData = sortedArray.slice(start, end);

  return createPaginatedResponse(paginatedData, params, array.length);
}
