'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/lib/api/organizations';
import { ApiResponse } from '@/lib/api/api-client';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationResponse,
} from '@/app/api/organizations/schemas';
import { PaginatedResponse } from '@/lib/pagination/types';

// Query keys for caching and invalidation
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...organizationKeys.lists(), filters] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
};

/**
 * Hook for fetching a paginated list of organizations
 */
export function useOrganizationsQuery(
  params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    name?: string;
  } = {},
  options?: Omit<
    UseQueryOptions<
      ApiResponse<PaginatedResponse<OrganizationResponse>>,
      Error,
      ApiResponse<PaginatedResponse<OrganizationResponse>>,
      QueryKey
    >,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => getOrganizations(params),
    ...options,
  });
}

/**
 * Hook for fetching a single organization by ID
 */
export function useOrganizationQuery(
  id: string,
  options?: Omit<
    UseQueryOptions<
      ApiResponse<OrganizationResponse>,
      Error,
      ApiResponse<OrganizationResponse>,
      QueryKey
    >,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => getOrganization(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook for creating a new organization
 */
export function useCreateOrganizationMutation(
  options?: Omit<
    UseMutationOptions<ApiResponse<OrganizationResponse>, Error, CreateOrganizationInput>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      // Invalidate the organizations list to refetch
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook for updating an organization
 */
export function useUpdateOrganizationMutation(
  id: string,
  options?: Omit<
    UseMutationOptions<ApiResponse<OrganizationResponse>, Error, UpdateOrganizationInput>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationInput) => updateOrganization(id, data),
    onSuccess: _data => {
      // Invalidate specific organization
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook for deleting an organization
 */
export function useDeleteOrganizationMutation(
  options?: Omit<
    UseMutationOptions<ApiResponse<{ success: boolean; message: string }>, Error, string>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrganization,
    onSuccess: (_, id) => {
      // Invalidate specific organization
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
    },
    ...options,
  });
}
