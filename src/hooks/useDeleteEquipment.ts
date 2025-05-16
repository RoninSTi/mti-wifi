import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEquipment } from '@/lib/api/equipment';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api/api-client';

interface DeleteResult {
  success: boolean;
  message: string;
}

/**
 * Hook for deleting an equipment item
 * @returns Object containing mutation function and states
 */
export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<DeleteResult>, Error, string>({
    mutationFn: async id => {
      const result = await deleteEquipment(id);
      return result as ApiResponse<DeleteResult>;
    },
    onSuccess: (_, equipmentId) => {
      // Invalidate equipment list queries
      queryClient.invalidateQueries({ queryKey: ['equipment'] });

      // Remove the specific equipment from the cache
      queryClient.removeQueries({ queryKey: ['equipment', equipmentId] });

      toast.success('Equipment deleted successfully');
    },
    onError: error => {
      toast.error(`Failed to delete equipment: ${error.message}`);
    },
  });

  return {
    deleteEquipment: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
