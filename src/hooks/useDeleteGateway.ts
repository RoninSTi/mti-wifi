import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteGateway } from '@/lib/api/gateways';
import { ApiResponse } from '@/lib/api/api-client';
import { toast } from 'sonner';

interface DeleteResult {
  success: boolean;
  message: string;
}

/**
 * Hook for deleting a gateway
 */
export function useDeleteGateway() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<DeleteResult>, Error, string>({
    mutationFn: deleteGateway,
    onSuccess: (response, variables) => {
      // Invalidate individual gateway query
      queryClient.removeQueries({ queryKey: ['gateway', variables] });

      // Invalidate gateway lists to refresh without the deleted gateway
      queryClient.invalidateQueries({ queryKey: ['gateways'] });

      // Show success toast
      toast.success('Gateway deleted successfully');

      return response;
    },
    onError: error => {
      // Show error toast
      const errorMessage = error.message.includes('Conflict')
        ? 'Cannot delete gateway that has sensors associated with it'
        : error.message;

      toast.error(`Failed to delete gateway: ${errorMessage}`);
      return error;
    },
  });

  return {
    deleteGateway: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
