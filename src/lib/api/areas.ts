/**
 * Area API functions to interact with the area endpoints
 */
import { apiClient } from './api-client';
import { CreateAreaInput, UpdateAreaInput, AreaResponse } from '@/app/api/areas/schemas';
// Note: PaginatedResponse imported from pagination/types is used implicitly in the return types

// Base URL for area endpoints
const AREAS_URL = '/api/areas';

/**
 * Get a paginated list of areas
 * @param page Page number (default: 1)
 * @param limit Items per page (default: 10)
 * @param sortBy Field to sort by
 * @param sortOrder Sort direction ('asc' or 'desc')
 * @param q General search query across all fields
 * @param locationId Filter by location ID
 * @param name Optional name filter
 * @param areaType Optional area type filter
 * @returns Paginated list of areas
 */
export const getAreas = async ({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  locationId,
  name,
  areaType,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  locationId?: string;
  name?: string;
  areaType?: string;
} = {}) => {
  // Use the specialized paginated API client method
  return apiClient.getPaginated<AreaResponse>(AREAS_URL, {
    page,
    limit,
    sortBy,
    sortOrder,
    q,
    locationId,
    name,
    areaType,
  });
};

/**
 * Get a single area by ID
 * @param id Area ID
 * @returns Area data
 */
export const getArea = async (id: string) => {
  return apiClient.get<AreaResponse>(`${AREAS_URL}/${id}`);
};

/**
 * Create a new area
 * @param data Area data
 * @returns Created area
 */
export const createArea = async (data: CreateAreaInput) => {
  return apiClient.post<AreaResponse>(AREAS_URL, data);
};

/**
 * Update an existing area
 * @param id Area ID
 * @param data Area data to update
 * @returns Updated area
 */
export const updateArea = async (id: string, data: UpdateAreaInput) => {
  return apiClient.put<AreaResponse>(`${AREAS_URL}/${id}`, data);
};

/**
 * Delete an area
 * @param id Area ID
 * @returns Deletion result
 */
export const deleteArea = async (id: string) => {
  return apiClient.delete<{ success: boolean; message: string }>(`${AREAS_URL}/${id}`);
};
