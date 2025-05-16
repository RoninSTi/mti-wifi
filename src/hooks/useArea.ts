import { useQuery } from '@tanstack/react-query';
import { getArea } from '@/lib/api/areas';
import { AreaResponse } from '@/app/api/areas/schemas';
import { ApiResponse } from '@/lib/api/api-client';

interface UseAreaResult {
  area: AreaResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Hook for fetching a single area by ID
 * @param id Area ID
 * @returns Area data with loading and error states
 */
export function useArea(id: string): UseAreaResult {
  const shouldFetch = id && id.length > 0;

  const { data, isLoading, isError, error } = useQuery<ApiResponse<AreaResponse>, Error>({
    queryKey: ['area', id],
    queryFn: () => getArea(id),
    enabled: !!shouldFetch,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get the area from data
  const area = data?.data || null;

  return {
    area,
    isLoading: !!shouldFetch && isLoading,
    isError,
    error,
  };
}
