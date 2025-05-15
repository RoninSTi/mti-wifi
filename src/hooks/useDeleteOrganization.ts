import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteOrganization } from '@/lib/api/organizations';

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
 */
export function useDeleteOrganization(): UseDeleteOrganizationResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteOrganization(id);

      // Handle API error
      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete organization');
      }
    },

    onSuccess: () => {
      // Invalidate organizations list query
      queryClient.invalidateQueries({
        queryKey: ['organizations'],
      });
    },
  });

  // Simple wrapper function
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
