import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/lib/api/organizations';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationResponse,
} from '@/app/api/organizations/schemas';
import { ApiResponse, PaginatedApiResponse } from '@/lib/api/api-client';

// Query hook for fetching a list of organizations
export function useOrganizationsQuery({
  page = 1,
  limit = 10,
  sortBy,
  sortOrder = 'desc',
  name,
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  name?: string;
} = {}) {
  return useQuery<PaginatedApiResponse<OrganizationResponse>, Error>({
    queryKey: ['organizations', { page, limit, sortBy, sortOrder, name }],
    queryFn: () => getOrganizations({ page, limit, sortBy, sortOrder, name }),
    staleTime: 60 * 1000, // 1 minute
  });
}

// Query hook for fetching a single organization
export function useOrganizationQuery(id: string, options?: { enabled?: boolean }) {
  return useQuery<ApiResponse<OrganizationResponse>, Error>({
    queryKey: ['organization', id],
    queryFn: () => getOrganization(id),
    enabled: options?.enabled !== false && !!id, // Disable if ID is empty or explicitly disabled
    staleTime: 60 * 1000, // 1 minute
  });
}

// Mutation hook for creating an organization
export function useCreateOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<OrganizationResponse>, Error, CreateOrganizationInput>({
    mutationFn: data => createOrganization(data),
    onSuccess: () => {
      // Invalidate organizations list to refresh data
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// Mutation hook for updating an organization
export function useUpdateOrganizationMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<OrganizationResponse>, Error, UpdateOrganizationInput>({
    mutationFn: data => updateOrganization(id, data),
    onSuccess: () => {
      // Invalidate both the list and the single organization queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', id] });
    },
  });
}

// Mutation hook for deleting an organization
export function useDeleteOrganizationMutation() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ success: boolean; message: string }>, Error, string>({
    mutationFn: id => deleteOrganization(id),
    onSuccess: (_, id) => {
      // Invalidate organizations list and remove the deleted organization from the cache
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.removeQueries({ queryKey: ['organization', id] });
    },
  });
}
