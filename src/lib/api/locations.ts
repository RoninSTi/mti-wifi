/**
 * Location API functions to interact with the location endpoints
 */
import { apiClient } from './api-client';
import {
  CreateLocationInput,
  UpdateLocationInput,
  LocationResponse,
} from '@/app/api/locations/schemas';
// Note: PaginatedResponse imported from pagination/types is used implicitly in the return types

// Base URL for location endpoints
const LOCATIONS_URL = '/api/locations';

/**
 * Get a paginated list of locations
 * @param page Page number (default: 1)
 * @param limit Items per page (default: 10)
 * @param sortBy Field to sort by
 * @param sortOrder Sort direction ('asc' or 'desc')
 * @param q General search query across all fields
 * @param organizationId Filter by organization ID
 * @param name Optional name filter
 * @param city Optional city filter
 * @param state Optional state filter
 * @returns Paginated list of locations
 */
export const getLocations = async ({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  organizationId,
  name,
  city,
  state,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  organizationId?: string;
  name?: string;
  city?: string;
  state?: string;
} = {}) => {
  // Use the specialized paginated API client method
  return apiClient.getPaginated<LocationResponse>(LOCATIONS_URL, {
    page,
    limit,
    sortBy,
    sortOrder,
    q,
    organizationId,
    name,
    city,
    state,
  });
};

/**
 * Get a single location by ID
 * @param id Location ID
 * @returns Location data
 */
export const getLocation = async (id: string) => {
  return apiClient.get<LocationResponse>(`${LOCATIONS_URL}/${id}`);
};

/**
 * Create a new location
 * @param data Location data
 * @returns Created location
 */
export const createLocation = async (data: CreateLocationInput) => {
  return apiClient.post<LocationResponse>(LOCATIONS_URL, data);
};

/**
 * Update an existing location
 * @param id Location ID
 * @param data Location data to update
 * @returns Updated location
 */
export const updateLocation = async (id: string, data: UpdateLocationInput) => {
  return apiClient.put<LocationResponse>(`${LOCATIONS_URL}/${id}`, data);
};

/**
 * Delete a location
 * @param id Location ID
 * @returns Deletion result
 */
export const deleteLocation = async (id: string) => {
  return apiClient.delete<{ success: boolean; message: string }>(`${LOCATIONS_URL}/${id}`);
};
