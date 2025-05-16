import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrganization } from '@/lib/api/organizations';
import { UpdateOrganizationInput, updateOrganizationSchema } from '@/app/api/organizations/schemas';
import { z } from 'zod';

export interface UseUpdateOrganizationResult {
  updateOrg: (id: string, data: UpdateOrganizationInput) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  reset: () => void;
  validationSchema: typeof updateOrganizationSchema;
}

/**
 * Hook for updating an organization
 */
export function useUpdateOrganization(): UseUpdateOrganizationResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrganizationInput }) => {
      const response = await updateOrganization(id, data);

      // Handle API error
      if (response.error) {
        throw new Error(response.error.message || 'Failed to update organization');
      }
    },

    onSuccess: (_, { id }) => {
      // Invalidate organizations list query
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });

      // Also invalidate the single organization query to update its details
      queryClient.invalidateQueries({
        queryKey: ['organization', id],
      });
    },
  });

  // Wrapper function with validation
  const updateOrg = async (id: string, data: UpdateOrganizationInput): Promise<void> => {
    try {
      // Validate the data with the schema
      updateOrganizationSchema.parse(data);
      await mutation.mutateAsync({ id, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };

  return {
    updateOrg,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
    validationSchema: updateOrganizationSchema,
  };
}
