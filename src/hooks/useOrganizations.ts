import { useQuery } from '@tanstack/react-query';
import { getOrganizations } from '@/lib/api/organizations';
import { OrganizationResponse } from '@/app/api/organizations/schemas';
import { PaginationMeta } from '@/lib/pagination/types';
import { PaginatedApiResponse } from '@/lib/api/api-client';

export interface UseOrganizationsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  name?: string;
}

export interface UseOrganizationsResult {
  organizations: OrganizationResponse[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  pagination: PaginationMeta | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching organizations with pagination and filtering
 */
export function useOrganizations({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  name,
}: UseOrganizationsParams = {}): UseOrganizationsResult {
  const queryKey = ['organizations', { page, limit, sortBy, sortOrder, name }];

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedApiResponse<OrganizationResponse>,
    Error
  >({
    queryKey,
    queryFn: () => getOrganizations({ page, limit, sortBy, sortOrder, name }),
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract organizations and pagination from the response
  const organizations = data?.data?.data || [];
  const pagination = data?.data?.meta || null;

  // Create refetch function
  const refetchData = async () => {
    await refetch();
  };

  return {
    organizations,
    isLoading,
    isError,
    error,
    pagination,
    refetch: refetchData,
  };
}
