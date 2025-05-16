import { useQuery } from '@tanstack/react-query';
import { getEquipmentById } from '@/lib/api/equipment';
import { EquipmentResponse } from '@/app/api/equipment/schemas';
import { ApiResponse } from '@/lib/api/api-client';

interface UseEquipmentResult {
  equipment: EquipmentResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/**
 * Hook for fetching a single equipment item by ID
 * @param id Equipment ID
 * @returns Equipment data with loading and error states
 */
export function useEquipment(id: string): UseEquipmentResult {
  const shouldFetch = id && id.length > 0;

  const { data, isLoading, isError, error, refetch } = useQuery<
    ApiResponse<EquipmentResponse>,
    Error
  >({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id),
    enabled: !!shouldFetch,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get the equipment from data
  const equipment = data?.data || null;

  return {
    equipment,
    isLoading: !!shouldFetch && isLoading,
    isError,
    error,
    refetch,
  };
}
