/**
 * Gateway API functions to interact with the gateway endpoints
 */
import { apiClient } from './api-client';
import {
  CreateGatewayInput,
  UpdateGatewayInput,
  GatewayResponse,
} from '@/app/api/gateways/schemas';
// Note: PaginatedResponse imported from pagination/types is used implicitly in the return types

// Base URL for gateway endpoints
const GATEWAYS_URL = '/api/gateways';

/**
 * Get a paginated list of gateways
 * @param page Page number (default: 1)
 * @param limit Items per page (default: 10)
 * @param sortBy Field to sort by
 * @param sortOrder Sort direction ('asc' or 'desc')
 * @param q General search query across all fields
 * @param locationId Filter by location ID
 * @param name Optional name filter
 * @param serialNumber Optional serial number filter
 * @param status Optional status filter ('disconnected', 'connected', 'authenticated')
 * @returns Paginated list of gateways
 */
export const getGateways = async ({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  locationId,
  name,
  serialNumber,
  status,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  locationId?: string;
  name?: string;
  serialNumber?: string;
  status?: 'disconnected' | 'connected' | 'authenticated';
} = {}) => {
  // Use the specialized paginated API client method
  return apiClient.getPaginated<GatewayResponse>(GATEWAYS_URL, {
    page,
    limit,
    sortBy,
    sortOrder,
    q,
    locationId,
    name,
    serialNumber,
    status,
  });
};

/**
 * Get a single gateway by ID
 * @param id Gateway ID
 * @returns Gateway data
 */
export const getGateway = async (id: string) => {
  return apiClient.get<GatewayResponse>(`${GATEWAYS_URL}/${id}`);
};

/**
 * Create a new gateway
 * @param data Gateway data
 * @returns Created gateway
 */
export const createGateway = async (data: CreateGatewayInput) => {
  return apiClient.post<GatewayResponse>(GATEWAYS_URL, data);
};

/**
 * Update an existing gateway
 * @param id Gateway ID
 * @param data Gateway data to update
 * @returns Updated gateway
 */
export const updateGateway = async (id: string, data: UpdateGatewayInput) => {
  return apiClient.patch<GatewayResponse>(`${GATEWAYS_URL}/${id}`, data);
};

/**
 * Delete a gateway
 * @param id Gateway ID
 * @returns Deletion result
 */
export const deleteGateway = async (id: string) => {
  return apiClient.delete<{ success: boolean; message: string }>(`${GATEWAYS_URL}/${id}`);
};
