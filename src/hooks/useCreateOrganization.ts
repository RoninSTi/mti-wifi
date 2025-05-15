import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrganization } from '@/lib/api/organizations';
import { CreateOrganizationInput, OrganizationResponse } from '@/app/api/organizations/schemas';
import { ApiResponse } from '@/lib/api/api-client';
import { z } from 'zod';

// We're using the same schema as the API for consistency
import { createOrganizationSchema } from '@/app/api/organizations/schemas';

export interface UseCreateOrganizationResult {
  createOrg: (data: CreateOrganizationInput) => Promise<ApiResponse<OrganizationResponse>>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  reset: () => void;
  validationSchema: typeof createOrganizationSchema;
}

/**
 * Hook for creating a new organization
 * Invalidates the organizations list query on success
 */
export function useCreateOrganization(): UseCreateOrganizationResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<OrganizationResponse>, Error, CreateOrganizationInput>({
    mutationFn: data => createOrganization(data),
    onSuccess: () => {
      // Invalidate the organizations list query to refresh data
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  const createOrg = async (data: CreateOrganizationInput) => {
    // We can optionally validate the data here using the schema
    // This is usually handled by the form, but it's good to have double validation
    try {
      createOrganizationSchema.parse(data);
      return await mutation.mutateAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };

  return {
    createOrg,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
    validationSchema: createOrganizationSchema,
  };
}
