import { useQuery } from '@tanstack/react-query';
import { getOrganization } from '@/lib/api/organizations';
import { OrganizationResponse, organizationResponseSchema } from '@/app/api/organizations/schemas';
import { ApiResponse } from '@/lib/api/api-client';
import { z } from 'zod';

export interface UseOrganizationResult {
  organization: OrganizationResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single organization by ID
 * Uses the shared Zod schema for organization responses
 */
export function useOrganization(id: string): UseOrganizationResult {
  const queryKey = ['organization', id];

  const { data, isLoading, isError, error, refetch } = useQuery<
    ApiResponse<OrganizationResponse>,
    Error
  >({
    queryKey,
    queryFn: () => getOrganization(id),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!id, // Only run query if id is provided
  });

  // Validate the response data using Zod schema
  let validatedOrganization: OrganizationResponse | null = null;

  if (data?.data) {
    try {
      validatedOrganization = organizationResponseSchema.parse(data.data);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Organization validation failed:', validationError.errors);
      }
      // Keep organization as null if validation fails
    }
  }

  // Create refetch function
  const refetchData = async () => {
    await refetch();
  };

  return {
    organization: validatedOrganization,
    isLoading,
    isError,
    error,
    refetch: refetchData,
  };
}
