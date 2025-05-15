import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteLocation } from '@/lib/api/locations';
import { ApiResponse } from '@/lib/api/api-client';

interface DeleteLocationResponse {
  success: boolean;
  message: string;
}

/**
 * Hook for deleting a location
 * @returns Object containing deletion function and states
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<DeleteLocationResponse>, Error, string>({
    mutationFn: async id => {
      const result = await deleteLocation(id);
      return result as ApiResponse<DeleteLocationResponse>;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['locations'] });

      // Remove the specific location from cache
      queryClient.removeQueries({ queryKey: ['location', variables] });
    },
  });

  return {
    deleteLocation: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
