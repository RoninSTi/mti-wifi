import { useQuery } from '@tanstack/react-query';
import { getGateways } from '@/lib/api/gateways';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { PaginationMeta } from '@/lib/pagination/types';
import { PaginatedApiResponse } from '@/lib/api/api-client';

export interface UseGatewaysParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  locationId?: string;
  name?: string;
  serialNumber?: string;
  status?: 'disconnected' | 'connected' | 'authenticated';
  enabled?: boolean; // Explicitly control whether the query runs
}

export interface UseGatewaysResult {
  gateways: GatewayResponse[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  pagination: PaginationMeta | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching gateways with pagination and filtering
 */
export function useGateways({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  locationId,
  name,
  serialNumber,
  status,
  enabled = true, // Default to true to always fetch unless explicitly disabled
}: UseGatewaysParams = {}): UseGatewaysResult {
  const queryKey = [
    'gateways',
    { page, limit, sortBy, sortOrder, q, locationId, name, serialNumber, status },
  ];

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedApiResponse<GatewayResponse>,
    Error
  >({
    queryKey,
    queryFn: () =>
      getGateways({ page, limit, sortBy, sortOrder, q, locationId, name, serialNumber, status }),
    staleTime: 60 * 1000, // 1 minute
    // Allow fetching all gateways or filtering by specific criteria
    enabled: true,
  });

  // Extract gateways and pagination from the response
  const gateways = data?.data?.data || [];
  const pagination = data?.data?.meta || null;

  // Create refetch function
  const refetchData = async () => {
    await refetch();
  };

  return {
    gateways,
    isLoading,
    isError,
    error,
    pagination,
    refetch: refetchData,
  };
}
