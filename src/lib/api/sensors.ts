/**
 * Sensors API functions to interact with the sensors endpoints
 */
import { apiClient } from './api-client';
import { CreateSensorInput, UpdateSensorInput, SensorResponse } from '@/app/api/sensors/schemas';
// Note: PaginatedResponse imported from pagination/types is used implicitly in the return types

// Base URL for sensor endpoints
const SENSORS_URL = '/api/sensors';

/**
 * Get a paginated list of sensors
 * @param page Page number (default: 1)
 * @param limit Items per page (default: 10)
 * @param sortBy Field to sort by
 * @param sortOrder Sort direction ('asc' or 'desc')
 * @param q General search query across all fields
 * @param equipmentId Filter by equipment ID
 * @param name Optional name filter
 * @param status Optional status filter
 * @param serial Optional serial number filter
 * @param connected Optional connected status filter
 * @returns Paginated list of sensors
 */
export const getSensors = async ({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  equipmentId,
  name,
  status,
  serial,
  connected,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  equipmentId?: string;
  name?: string;
  status?: 'active' | 'inactive' | 'warning' | 'error';
  serial?: number;
  connected?: boolean;
} = {}) => {
  // Use the specialized paginated API client method
  return apiClient.getPaginated<SensorResponse>(SENSORS_URL, {
    page,
    limit,
    sortBy,
    sortOrder,
    q,
    equipmentId,
    name,
    status,
    serial: serial !== undefined ? String(serial) : undefined,
    connected: connected !== undefined ? String(connected) : undefined,
  });
};

/**
 * Get sensors for a specific equipment
 * @param equipmentId Equipment ID
 * @param params Optional parameters for pagination and filtering
 * @returns Paginated list of sensors for the equipment
 */
export const getSensorsByEquipment = async (
  equipmentId: string,
  params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    q?: string;
    name?: string;
    status?: 'active' | 'inactive' | 'warning' | 'error';
    connected?: boolean;
  } = {}
) => {
  return getSensors({ ...params, equipmentId });
};

/**
 * Get a single sensor by ID
 * @param id Sensor ID
 * @returns Sensor data
 */
export const getSensorById = async (id: string) => {
  return apiClient.get<SensorResponse>(`${SENSORS_URL}/${id}`);
};

/**
 * Create a new sensor
 * @param data Sensor data
 * @returns Created sensor
 */
export const createSensor = async (data: CreateSensorInput) => {
  return apiClient.post<SensorResponse>(SENSORS_URL, data);
};

/**
 * Update an existing sensor
 * @param id Sensor ID
 * @param data Sensor data to update
 * @returns Updated sensor
 */
export const updateSensor = async (id: string, data: UpdateSensorInput) => {
  return apiClient.patch<SensorResponse>(`${SENSORS_URL}/${id}`, data);
};

/**
 * Delete a sensor
 * @param id Sensor ID
 * @returns Deletion result
 */
export const deleteSensor = async (id: string) => {
  return apiClient.delete<{ success: boolean; message: string }>(`${SENSORS_URL}/${id}`);
};
