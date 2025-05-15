/**
 * Organization API functions to interact with the organization endpoints
 */
import { apiClient } from './api-client';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationResponse,
} from '@/app/api/organizations/schemas';
import { PaginatedResponse } from '@/lib/pagination/types';

// Base URL for organization endpoints
const ORGANIZATIONS_URL = '/api/organizations';

/**
 * Get a paginated list of organizations
 * @param page Page number (default: 1)
 * @param limit Items per page (default: 10)
 * @param sortBy Field to sort by
 * @param sortOrder Sort direction ('asc' or 'desc')
 * @param name Optional name filter
 * @returns Paginated list of organizations
 */
export const getOrganizations = async ({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  name,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  name?: string;
} = {}) => {
  // Build query parameters
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  if (sortBy) {
    params.append('sortBy', sortBy);
  }

  params.append('sortOrder', sortOrder);

  if (name) {
    params.append('name', name);
  }

  const url = `${ORGANIZATIONS_URL}?${params.toString()}`;

  return apiClient.get<PaginatedResponse<OrganizationResponse>>(url);
};

/**
 * Get a single organization by ID
 * @param id Organization ID
 * @returns Organization data
 */
export const getOrganization = async (id: string) => {
  return apiClient.get<OrganizationResponse>(`${ORGANIZATIONS_URL}/${id}`);
};

/**
 * Create a new organization
 * @param data Organization data
 * @returns Created organization
 */
export const createOrganization = async (data: CreateOrganizationInput) => {
  return apiClient.post<OrganizationResponse>(ORGANIZATIONS_URL, data);
};

/**
 * Update an existing organization
 * @param id Organization ID
 * @param data Organization data to update
 * @returns Updated organization
 */
export const updateOrganization = async (id: string, data: UpdateOrganizationInput) => {
  return apiClient.put<OrganizationResponse>(`${ORGANIZATIONS_URL}/${id}`, data);
};

/**
 * Delete an organization
 * @param id Organization ID
 * @returns Deletion result
 */
export const deleteOrganization = async (id: string) => {
  return apiClient.delete<{ success: boolean; message: string }>(`${ORGANIZATIONS_URL}/${id}`);
};
