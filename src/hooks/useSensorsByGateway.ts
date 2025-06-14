import { useQuery } from '@tanstack/react-query';
import { getSensorsByGateway } from '@/lib/api/sensors';
import { SensorResponse } from '@/app/api/sensors/schemas';
import { PaginatedResponse } from '@/lib/pagination/types';
import { ApiResponse } from '@/lib/api/api-client';

/**
 * Hook for fetching sensors for a specific gateway
 * @param gatewayId ID of the gateway to fetch sensors for
 * @param options Query options including pagination and filters
 * @returns Object containing sensors data and query states
 */
// Define options type using the SensorResponse type for proper field typing
export type SensorsByGatewayQueryOptions = {
  page?: number;
  limit?: number;
  enabled?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  name?: string;
  status?: SensorResponse['status']; // Use the schema-derived type
  connected?: boolean;
  q?: string; // Search query parameter
  serial?: number;
};

// Define return type for the hook
export type UseSensorsByGatewayResult = {
  sensors: SensorResponse[];
  pagination: PaginatedResponse<SensorResponse>['meta'] | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  // We include refetch here but it should rarely be used directly
  // Prefer using query invalidation in mutation hooks instead
  refetch: () => Promise<unknown>;
};

// Use proper return type annotation
export function useSensorsByGateway(
  gatewayId: string,
  options: SensorsByGatewayQueryOptions = {}
): UseSensorsByGatewayResult {
  const { page = 1, limit = 50, enabled = true, ...restOptions } = options;

  const { data, isLoading, isError, error, refetch } = useQuery<
    ApiResponse<PaginatedResponse<SensorResponse>>,
    Error
  >({
    queryKey: ['sensors', 'gateway', { gatewayId, page, limit, ...restOptions }],
    queryFn: () => getSensorsByGateway(gatewayId, { page, limit, ...restOptions }),
    enabled: Boolean(gatewayId) && enabled,
  });

  // Extract normalized data from the response
  const sensors = data?.data?.data ?? [];
  const pagination = data?.data?.meta ?? null;

  return {
    sensors,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
  };
}
