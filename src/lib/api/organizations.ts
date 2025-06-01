/**
 * Organization API functions to interact with the organization endpoints
 */
import { apiClient } from './api-client';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationResponse,
} from '@/app/api/organizations/schemas';
// Note: PaginatedResponse imported from pagination/types is used implicitly in the return types

// Base URL for organization endpoints
const ORGANIZATIONS_URL = '/api/organizations';

/**
 * Get a paginated list of organizations
 * @param page Page number (default: 1)
 * @param limit Items per page (default: 10)
 * @param sortBy Field to sort by
 * @param sortOrder Sort direction ('asc' or 'desc')
 * @param q General search query across all fields
 * @param name Optional name filter
 * @param contactName Optional contact name filter
 * @param contactEmail Optional contact email filter
 * @returns Paginated list of organizations
 */
export const getOrganizations = async ({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  name,
  contactName,
  contactEmail,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  name?: string;
  contactName?: string;
  contactEmail?: string;
} = {}) => {
  // Use the specialized paginated API client method
  return apiClient.getPaginated<OrganizationResponse>(ORGANIZATIONS_URL, {
    page,
    limit,
    sortBy,
    sortOrder,
    q,
    name,
    contactName,
    contactEmail,
  });
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

/**
 * Get organization hierarchy for navigation tree
 * @param id Organization ID
 * @returns Organization with nested locations, areas, equipment, and sensors
 */
export const getOrganizationHierarchy = async (id: string) => {
  return apiClient.get<{
    _id: string;
    name: string;
    locations: Array<{
      _id: string;
      name: string;
      areas: Array<{
        _id: string;
        name: string;
        equipment: Array<{
          _id: string;
          name: string;
          status: 'active' | 'inactive' | 'maintenance' | 'failed';
          sensors: Array<{
            _id: string;
            name: string;
            status: 'active' | 'inactive' | 'warning' | 'error';
            connected: boolean;
          }>;
        }>;
      }>;
    }>;
  }>(`${ORGANIZATIONS_URL}/${id}/hierarchy`);
};
