import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEquipment } from '@/lib/api/equipment';
import { CreateEquipmentInput, EquipmentResponse } from '@/app/api/equipment/schemas';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api/api-client';

/**
 * Hook for creating a new equipment item
 * @returns Object containing mutation function and states
 */
export function useCreateEquipment() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<EquipmentResponse>, Error, CreateEquipmentInput>({
    mutationFn: async data => {
      const result = await createEquipment(data);
      return result as ApiResponse<EquipmentResponse>;
    },
    onSuccess: response => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['equipment'] });

      // If we have an area ID, invalidate that specific query too
      if (response.data?.area._id) {
        queryClient.invalidateQueries({
          queryKey: ['equipment', { areaId: response.data.area._id }],
        });
      }

      toast.success('Equipment created successfully');
    },
    onError: error => {
      toast.error(`Failed to create equipment: ${error.message}`);
    },
  });

  return {
    createEquipment: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
