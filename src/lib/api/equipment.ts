/**
 * Equipment API functions to interact with the equipment endpoints
 */
import { apiClient } from './api-client';
import {
  CreateEquipmentInput,
  UpdateEquipmentInput,
  EquipmentResponse,
} from '@/app/api/equipment/schemas';
// Note: PaginatedResponse imported from pagination/types is used implicitly in the return types

// Base URL for equipment endpoints
const EQUIPMENT_URL = '/api/equipment';

/**
 * Get a paginated list of equipment
 * @param page Page number (default: 1)
 * @param limit Items per page (default: 10)
 * @param sortBy Field to sort by
 * @param sortOrder Sort direction ('asc' or 'desc')
 * @param q General search query across all fields
 * @param areaId Filter by area ID
 * @param name Optional name filter
 * @param equipmentType Optional equipment type filter
 * @param status Optional status filter
 * @param maintenanceDue Optional maintenance due filter
 * @returns Paginated list of equipment
 */
export const getEquipment = async ({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  areaId,
  name,
  equipmentType,
  status,
  maintenanceDue,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  areaId?: string;
  name?: string;
  equipmentType?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'failed';
  maintenanceDue?: boolean;
} = {}) => {
  // Use the specialized paginated API client method
  return apiClient.getPaginated<EquipmentResponse>(EQUIPMENT_URL, {
    page,
    limit,
    sortBy,
    sortOrder,
    q,
    areaId,
    name,
    equipmentType,
    status,
    maintenanceDue: maintenanceDue !== undefined ? String(maintenanceDue) : undefined,
  });
};

/**
 * Get a single equipment item by ID
 * @param id Equipment ID
 * @returns Equipment data
 */
export const getEquipmentById = async (id: string) => {
  return apiClient.get<EquipmentResponse>(`${EQUIPMENT_URL}/${id}`);
};

/**
 * Create a new equipment item
 * @param data Equipment data
 * @returns Created equipment
 */
export const createEquipment = async (data: CreateEquipmentInput) => {
  return apiClient.post<EquipmentResponse>(EQUIPMENT_URL, data);
};

/**
 * Update an existing equipment
 * @param id Equipment ID
 * @param data Equipment data to update
 * @returns Updated equipment
 */
export const updateEquipment = async (id: string, data: UpdateEquipmentInput) => {
  return apiClient.put<EquipmentResponse>(`${EQUIPMENT_URL}/${id}`, data);
};

/**
 * Delete an equipment item
 * @param id Equipment ID
 * @returns Deletion result
 */
export const deleteEquipment = async (id: string) => {
  return apiClient.delete<{ success: boolean; message: string }>(`${EQUIPMENT_URL}/${id}`);
};
