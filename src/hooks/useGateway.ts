import { useQuery } from '@tanstack/react-query';
import { getGateway } from '@/lib/api/gateways';
import { GatewayResponse } from '@/app/api/gateways/schemas';
import { ApiResponse } from '@/lib/api/api-client';

export interface UseGatewayResult {
  gateway: GatewayResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single gateway by ID
 */
export function useGateway(gatewayId: string): UseGatewayResult {
  const { data, isLoading, isError, error, refetch } = useQuery<
    ApiResponse<GatewayResponse>,
    Error
  >({
    queryKey: ['gateway', gatewayId],
    queryFn: () => getGateway(gatewayId),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!gatewayId, // Only run query if we have a gatewayId
  });

  // Extract gateway from the response
  const gateway = data?.data || null;

  // Create refetch function
  const refetchData = async () => {
    await refetch();
  };

  return {
    gateway,
    isLoading,
    isError,
    error,
    refetch: refetchData,
  };
}
