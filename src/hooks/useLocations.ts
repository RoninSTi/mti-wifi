import { useQuery } from '@tanstack/react-query';
import { getLocations } from '@/lib/api/locations';
import { LocationResponse } from '@/app/api/locations/schemas';
import { PaginationMeta } from '@/lib/pagination/types';
import { PaginatedApiResponse } from '@/lib/api/api-client';

export interface UseLocationsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  organizationId?: string;
  name?: string;
  city?: string;
  state?: string;
}

export interface UseLocationsResult {
  locations: LocationResponse[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  pagination: PaginationMeta | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching locations with pagination and filtering
 */
export function useLocations({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  organizationId,
  name,
  city,
  state,
}: UseLocationsParams = {}): UseLocationsResult {
  const queryKey = [
    'locations',
    { page, limit, sortBy, sortOrder, q, organizationId, name, city, state },
  ];

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedApiResponse<LocationResponse>,
    Error
  >({
    queryKey,
    queryFn: () =>
      getLocations({ page, limit, sortBy, sortOrder, q, organizationId, name, city, state }),
    staleTime: 60 * 1000, // 1 minute
    // Only fetch if we have an organizationId or other filter
    enabled: !!organizationId || !!q || !!name || !!city || !!state,
  });

  // Extract locations and pagination from the response
  const locations = data?.data?.data || [];
  const pagination = data?.data?.meta || null;

  // Create refetch function
  const refetchData = async () => {
    await refetch();
  };

  return {
    locations,
    isLoading,
    isError,
    error,
    pagination,
    refetch: refetchData,
  };
}
