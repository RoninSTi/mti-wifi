import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteArea } from '@/lib/api/areas';
import { ApiResponse } from '@/lib/api/api-client';

export interface UseDeleteAreaResult {
  deleteArea: (id: string) => Promise<ApiResponse<{ success: boolean; message: string }>>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
}

/**
 * Hook for deleting an area
 * @returns Mutation function and state
 */
export function useDeleteArea(): UseDeleteAreaResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => deleteArea(id),
    onSuccess: () => {
      // Invalidate all area-related queries
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });

  return {
    deleteArea: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}
