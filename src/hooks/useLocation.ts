import { useQuery } from '@tanstack/react-query';
import { getLocation } from '@/lib/api/locations';
import { LocationResponse } from '@/app/api/locations/schemas';
import { ApiResponse } from '@/lib/api/api-client';

interface UseLocationResult {
  location: LocationResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Hook for fetching a single location by ID
 * @param id Location ID
 * @returns Location data with loading and error states
 */
export function useLocation(id: string): UseLocationResult {
  const shouldFetch = id && id.length > 0;

  const { data, isLoading, isError, error } = useQuery<ApiResponse<LocationResponse>, Error>({
    queryKey: ['location', id],
    queryFn: () => getLocation(id),
    enabled: !!shouldFetch,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    location: data?.data || null,
    isLoading: !!shouldFetch && isLoading,
    isError,
    error,
  };
}
