import { useQuery } from '@tanstack/react-query';
import { getSensorsByEquipment } from '@/lib/api/sensors';
import { SensorResponse } from '@/app/api/sensors/schemas';
import { PaginatedResponse } from '@/lib/pagination/types';
import { ApiResponse } from '@/lib/api/api-client';

/**
 * Hook for fetching sensors for a specific equipment
 * @param equipmentId ID of the equipment to fetch sensors for
 * @param options Query options including pagination and filters
 * @returns Object containing sensors data and query states
 */
export function useSensors(
  equipmentId: string,
  options: {
    page?: number;
    limit?: number;
    enabled?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    name?: string;
    status?: 'active' | 'inactive' | 'warning' | 'error';
    connected?: boolean;
  } = {}
) {
  const { page = 1, limit = 10, enabled = true, ...restOptions } = options;

  const { data, isLoading, isError, error, refetch } = useQuery<
    ApiResponse<PaginatedResponse<SensorResponse>>,
    Error
  >({
    queryKey: ['sensors', { equipmentId, page, limit, ...restOptions }],
    queryFn: () => getSensorsByEquipment(equipmentId, { page, limit, ...restOptions }),
    enabled: Boolean(equipmentId) && enabled,
  });

  // Extract normalized data from the response
  const sensors = data?.data?.data || [];
  const pagination = data?.data?.meta || null;

  return {
    sensors,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
  };
}
