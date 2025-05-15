import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteOrganization } from '@/lib/api/organizations';
import { z } from 'zod';

// Zod schema for delete response validation
const deleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type DeleteOrganizationResponse = z.infer<typeof deleteResponseSchema>;

export interface UseDeleteOrganizationResult {
  deleteOrg: (id: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  reset: () => void;
}

/**
 * Hook for deleting an organization
 * Invalidates relevant organization queries on success
 */
export function useDeleteOrganization(): UseDeleteOrganizationResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteOrganization(id);

      // Validate the response with our schema
      if (response.data) {
        try {
          return deleteResponseSchema.parse(response.data);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error(
              `Invalid delete response: ${error.errors.map(e => e.message).join(', ')}`
            );
          }
          throw error;
        }
      }

      // If there is an error in the API response, throw it
      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete organization');
      }

      throw new Error('No data or error returned from the API');
    },

    onSuccess: (_, id) => {
      // Invalidate the organizations list query
      queryClient.invalidateQueries({ queryKey: ['organizations'] });

      // Remove the specific organization from the cache
      queryClient.removeQueries({ queryKey: ['organization', id] });
    },
  });

  // Create a wrapper function to make deletion easier to use
  const deleteOrg = async (id: string): Promise<void> => {
    await mutation.mutateAsync(id);
  };

  return {
    deleteOrg,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
