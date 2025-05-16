import { useQuery } from '@tanstack/react-query';
import { getAreas } from '@/lib/api/areas';
import { AreaResponse } from '@/app/api/areas/schemas';
import { PaginationMeta } from '@/lib/pagination/types';
import { PaginatedApiResponse } from '@/lib/api/api-client';

export interface UseAreasParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  locationId?: string;
  name?: string;
  areaType?: string;
}

export interface UseAreasResult {
  areas: AreaResponse[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  pagination: PaginationMeta | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching areas with pagination and filtering
 */
export function useAreas({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  q,
  locationId,
  name,
  areaType,
}: UseAreasParams = {}): UseAreasResult {
  const queryKey = ['areas', { page, limit, sortBy, sortOrder, q, locationId, name, areaType }];

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedApiResponse<AreaResponse>,
    Error
  >({
    queryKey,
    queryFn: () => getAreas({ page, limit, sortBy, sortOrder, q, locationId, name, areaType }),
    staleTime: 60 * 1000, // 1 minute
    // Only fetch if we have a locationId or other filter
    enabled: !!locationId || !!q || !!name || !!areaType,
  });

  // Extract areas and pagination from the response
  const areas = data?.data?.data || [];
  const pagination = data?.data?.meta || null;

  // Create refetch function
  const refetchData = async () => {
    await refetch();
  };

  return {
    areas,
    isLoading,
    isError,
    error,
    pagination,
    refetch: refetchData,
  };
}
