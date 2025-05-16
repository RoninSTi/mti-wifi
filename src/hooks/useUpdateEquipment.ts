import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEquipment } from '@/lib/api/equipment';
import { UpdateEquipmentInput, EquipmentResponse } from '@/app/api/equipment/schemas';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api/api-client';

interface UpdateEquipmentParams {
  id: string;
  data: UpdateEquipmentInput;
}

/**
 * Hook for updating an existing equipment item
 * @returns Object containing mutation function and states
 */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  const mutation = useMutation<ApiResponse<EquipmentResponse>, Error, UpdateEquipmentParams>({
    mutationFn: async ({ id, data }) => {
      const result = await updateEquipment(id, data);
      return result as ApiResponse<EquipmentResponse>;
    },
    onSuccess: (response, variables) => {
      // Invalidate equipment list queries
      queryClient.invalidateQueries({ queryKey: ['equipment'] });

      // Invalidate the specific equipment query
      queryClient.invalidateQueries({ queryKey: ['equipment', variables.id] });

      // If we have access to area ID in the response, invalidate that specific query too
      if (response.data?.area._id) {
        queryClient.invalidateQueries({
          queryKey: ['equipment', { areaId: response.data.area._id }],
        });
      }

      toast.success('Equipment updated successfully');
    },
    onError: error => {
      toast.error(`Failed to update equipment: ${error.message}`);
    },
  });

  return {
    updateEquipment: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
